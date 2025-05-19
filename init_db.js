const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("materials.db");

// Create tables
db.serialize(() => {
  // User table
  db.run(`CREATE TABLE IF NOT EXISTS "user" (
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        id INTEGER NOT NULL,
        CONSTRAINT user_pk PRIMARY KEY (id)
    )`);

  // Product table
  db.run(`CREATE TABLE IF NOT EXISTS product (
        image TEXT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        characteristic TEXT,
        id INTEGER NOT NULL PRIMARY KEY
    )`);

  // Cart table
  db.run(`CREATE TABLE IF NOT EXISTS cart (
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        id INTEGER NOT NULL,
        CONSTRAINT cart_pk PRIMARY KEY (id),
        FOREIGN KEY (user_id) REFERENCES "user" (id),
        FOREIGN KEY (product_id) REFERENCES product (id)
    )`);

  // Orders table
  db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER NOT NULL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        order_date DATETIME NOT NULL,
        total_amount REAL NOT NULL,
        FOREIGN KEY (user_id) REFERENCES "user" (id)
    )`);

  // Order items table
  db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER NOT NULL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (product_id) REFERENCES product (id)
    )`);

  // Rental dates table
  db.run(`CREATE TABLE IF NOT EXISTS rental_dates (
        user_id INTEGER NOT NULL PRIMARY KEY,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        FOREIGN KEY (user_id) REFERENCES "user" (id)
    )`);

  // Insert sample products
  const products = [
    {
      id: 1,
      name: "Дрель Trigger",
      price: 500,
      image: "images/drel.jpg",
      characteristic: "Мощность: 750 Вт, Скорость: 3000 об/мин, Вес: 1.5 кг",
    },
    {
      id: 2,
      name: "Шуруповерт Makita",
      price: 400,
      image: "images/shyryp.jpg",
      characteristic:
        "Мощность: 18 В (аккумуляторный), Крутящий момент: 50 Н·м, Вес: 1.3 кг",
    },
    {
      id: 3,
      name: "Стремянка",
      price: 300,
      image: "images/lestnica.png",
      characteristic:
        "Высота: 4 ступени (примерно 1.5 м), Материал: алюминий, Макс. нагрузка: 150 кг",
    },
    {
      id: 4,
      name: "Набор отверток Центроинструмент",
      price: 550,
      image: "images/otwert.webp",
      characteristic:
        "Количество предметов: 10 шт, Материал рукояток: прорезиненный пластик, Типы наконечников: плоские, крестовые, шестигранные",
    },
    {
      id: 5,
      name: "Болгарка Bosch",
      price: 400,
      image: "images/bolgarka.webp",
      characteristic: "Мощность: 1100 Вт, Диаметр диска: 125 мм, Вес: 2.4 кг",
    },
    {
      id: 6,
      name: "Перфоратор Makita",
      price: 650,
      image: "images/perforator.webp",
      characteristic: "Мощность: 800 Вт, Энергия удара: 3 Дж, Вес: 2.8 кг",
    },
  ];

  const stmt = db.prepare(
    "INSERT OR REPLACE INTO product (id, name, price, image, characteristic) VALUES (?, ?, ?, ?, ?)"
  );
  products.forEach((product) => {
    stmt.run(
      product.id,
      product.name,
      product.price,
      product.image,
      product.characteristic
    );
  });
  stmt.finalize();

  console.log("Database initialized successfully");
});

db.close();
