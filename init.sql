-- Create tables
CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    image TEXT NOT NULL,
    category text not null,
    characteristic TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cart (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id),
    product_id INTEGER NOT NULL REFERENCES product(id)
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id),
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount INTEGER NOT NULL,
    payment_method text not null
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES product(id),
    price INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rental_dates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL
);

-- Insert sample products
INSERT INTO product (name, price, image, category, characteristic) VALUES
    ('Дрель Trigger', 500, 'images/drel.jpg','Дрели и перфораторы', 'Мощность: 750 Вт, Скорость: 3000 об/мин, Вес: 1.5 кг'),
    ('Шуруповерт Makita', 400, 'images/shyryp.jpg','Шуруповерты', 'Мощность: 18 В (аккумуляторный), Крутящий момент: 50 Н·м, Вес: 1.3 кг'),
    ('Стремянка', 300, 'images/lestnica.png','Прочее', 'Высота: 4 ступени (примерно 1.5 м), Материал: алюминий, Макс. нагрузка: 150 кг'),
    ('Набор отверток Центроинструмент', 550, 'images/otwert.webp','Прочее', 'Количество предметов: 10 шт, Материал рукояток: прорезиненный пластик, Типы наконечников: плоские, крестовые, шестигранные'),
    ('Болгарка Bosch', 400, 'images/bolgarka.webp', 'Болгарки', 'Мощность: 1100 Вт, Диаметр диска: 125 мм, Вес: 2.4 кг'),
    ('Перфоратор Makita', 650, 'images/perforator.webp', 'Дрели и перфораторы','Мощность: 800 Вт, Энергия удара: 3 Дж, Вес: 2.8 кг')
ON CONFLICT (id) DO NOTHING; 

SELECT setval('product_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM product), false);
