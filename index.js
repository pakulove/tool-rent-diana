require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const pool = require("./config");
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use(express.static("static"));

// Auth endpoints
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Имя пользователя и пароль обязательны" });
  }

  try {
    // Check if user already exists
    const { rows: existingUsers } = await pool.query(
      'SELECT id FROM "user" WHERE username = $1',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: "Пользователь уже существует" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const {
      rows: [newUser],
    } = await pool.query(
      'INSERT INTO "user" (username, password) VALUES ($1, $2) RETURNING id',
      [username, hashedPassword]
    );

    // Set cookie
    res.cookie("user_id", newUser.id, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({ message: "Регистрация прошла успешно" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка базы данных" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  try {
    // Get user
    const {
      rows: [user],
    } = await pool.query(
      'SELECT id, password FROM "user" WHERE username = $1',
      [username]
    );

    if (!user) {
      return res
        .status(401)
        .json({ error: "Неверное имя пользователя или пароль" });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res
        .status(401)
        .json({ error: "Неверное имя пользователя или пароль" });
    }

    // Set cookie
    res.cookie("user_id", user.id, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({ message: "Вход в систему прошел успешно" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Неверное имя пользователя или пароль" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("user_id", {
    httpOnly: true,
    path: "/",
  });
  res.send('<a href="/login.html">Войти</a>');
});

app.get("/api/auth/me", async (req, res) => {
  const userId = req.cookies.user_id;
  if (userId) {
    const {
      rows: [user],
    } = await pool.query('SELECT username FROM "user" WHERE id = $1', [userId]);
    if (user) {
      res.send(`
        <a href="/profile.html" class="profile-link">Личный кабинет</a>
        <button onclick="logout()" class="logout-btn">Выйти</button>
      `);
      return;
    }
  }
  res.send('<a href="/login.html">Войти</a>');
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "static/index.html"));
});

// Get products list
app.get("/api/products", async (req, res) => {
  try {
    const { rows: products } = await pool.query("SELECT * FROM product");

    let html = "";
    products.forEach((product) => {
      html += `
        <div class="tool-item">
          <img src="${product.image}" alt="${product.name}" />
          <h2>${product.name}</h2>
          <p>Цена: ${product.price} ₽/день</p>
          <div class="tool-info">
            <p>⚙️ Характеристики:</p>
            <ul>
              ${product.characteristic
                .split(", ")
                .map((char) => `<li>${char}</li>`)
                .join("")}
            </ul>
          </div>
          <button
            hx-post="/api/cart/add"
            hx-vals='{"product_id": ${product.id}}'
            hx-swap="none"
            hx-trigger="click"
            hx-on::after-request="document.body.dispatchEvent(new Event('cart-updated'))"
          >
            Добавить в корзину
          </button>
        </div>
      `;
    });
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка базы данных");
  }
});

// Get categories
app.get("/api/categories", async (req, res) => {
  try {
    const { rows: products } = await pool.query(
      "SELECT DISTINCT category FROM product WHERE category IS NOT NULL"
    );

    const categories = products.map((p) => p.category).sort();
    const options = categories
      .map((category) => `<option value="${category}">${category}</option>`)
      .join("");

    res.send(options);
  } catch (error) {
    console.error("Error in /api/categories:", error);
    res.status(500).send("Error fetching categories");
  }
});

// Get prices with filtering
app.get("/api/prices", async (req, res) => {
  const { category } = req.query;

  try {
    let query = "SELECT * FROM product";
    const params = [];

    if (category && category !== "all") {
      query += " WHERE category = $1";
      params.push(category);
    }

    const { rows: products } = await pool.query(query, params);

    let productsHtml = "";
    products.forEach((product) => {
      productsHtml += `
        <div class="price-item">
          <img src="${product.image}" alt="${product.name}" />
          <h2>${product.name}</h2>
          <p>Цена: ${product.price} ₽/день</p>
          <div class="price-info">
            <p>⚙️ Характеристики:</p>
            <ul>
              ${product.characteristic
                .split(", ")
                .map((char) => `<li>${char}</li>`)
                .join("")}
            </ul>
          </div>
          <button
            hx-post="/api/cart/add"
            hx-vals='{"product_id": ${product.id}}'
            hx-swap="none"
            hx-trigger="click"
            hx-on::after-request="document.body.dispatchEvent(new Event('cart-updated'))"
          >
            Добавить в корзину
          </button>
        </div>
      `;
    });

    res.send(productsHtml);
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка базы данных");
  }
});

// Cart API endpoints
app.get("/api/cart/items", async (req, res) => {
  const user_id = req.cookies.user_id;
  if (!user_id) {
    return res.status(401).json({
      error: "Not authenticated",
      redirect: "/login.html",
    });
  }

  try {
    const { rows: items } = await pool.query(
      `SELECT c.id, p.name, p.price, p.image 
       FROM cart c 
       JOIN product p ON c.product_id = p.id 
       WHERE c.user_id = $1`,
      [user_id]
    );

    const total = items.reduce((sum, item) => sum + parseFloat(item.price), 0);

    let html = "";
    items.forEach((item) => {
      html += `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px;">
          <span>${item.name}</span>
          <span>${item.price} ₽</span>
          <button hx-delete="/api/cart/remove/${item.id}"
                  hx-swap="none"
                  hx-trigger="click"
                  hx-on::after-request="document.body.dispatchEvent(new Event('cart-updated'))">
            ❌
          </button>
        </div>
      `;
    });

    html += `<h3 id="total-price">Итого: ${total} ₽</h3>`;
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

app.post("/api/cart/add", async (req, res) => {
  const user_id = req.cookies.user_id;
  if (!user_id) {
    return res.status(401).json({
      error: "Not authenticated",
      redirect: "/login.html",
    });
  }

  const { product_id } = req.body;

  try {
    // Check if product exists
    const {
      rows: [product],
    } = await pool.query("SELECT id FROM product WHERE id = $1", [product_id]);

    if (!product) {
      return res.status(404).json({ error: "Товар не найден" });
    }

    // Add to cart
    await pool.query("INSERT INTO cart (user_id, product_id) VALUES ($1, $2)", [
      user_id,
      product_id,
    ]);

    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка базы данных" });
  }
});

app.delete("/api/cart/remove/:id", async (req, res) => {
  const user_id = req.cookies.user_id;
  if (!user_id) {
    return res.status(401).json({
      error: "Not authenticated",
      redirect: "/login.html",
    });
  }

  try {
    await pool.query("DELETE FROM cart WHERE id = $1 AND user_id = $2", [
      req.params.id,
      user_id,
    ]);

    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка базы данных" });
  }
});

app.post("/api/cart/clear", async (req, res) => {
  const user_id = req.cookies.user_id;
  if (!user_id) {
    return res.status(401).json({
      error: "Not authenticated",
      redirect: "/login.html",
    });
  }

  try {
    await pool.query("DELETE FROM cart WHERE user_id = $1", [user_id]);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка базы данных" });
  }
});

app.post("/api/cart/checkout", async (req, res) => {
  const user_id = req.cookies.user_id;
  if (!user_id) {
    return res.status(401).json({
      error: "Not authenticated",
      redirect: "/login.html",
    });
  }

  const {
    "start-date": start_date,
    "end-date": end_date,
    payment: payment_method,
  } = req.body;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: "Даты обязательны" });
  }

  try {
    // Get cart items
    const { rows: items } = await pool.query(
      `SELECT c.id, p.id as product_id, p.name, p.price 
       FROM cart c 
       JOIN product p ON c.product_id = p.id 
       WHERE c.user_id = $1`,
      [user_id]
    );

    if (items.length === 0) {
      return res.status(400).json({ error: "Корзина пуста" });
    }

    const total = items.reduce((sum, item) => sum + parseFloat(item.price), 0);

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Create rental dates
      const {
        rows: [rentalDates],
      } = await client.query(
        "INSERT INTO rental_dates (user_id, start_date, end_date) VALUES ($1, $2, $3) RETURNING id",
        [user_id, start_date, end_date]
      );

      // Create order
      const {
        rows: [order],
      } = await client.query(
        "INSERT INTO orders (user_id, total_amount, payment_method) VALUES ($1, $2, $3) RETURNING id",
        [user_id, total, payment_method]
      );

      // Add order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        price: item.price,
      }));

      for (const item of orderItems) {
        await client.query(
          "INSERT INTO order_items (order_id, product_id, price) VALUES ($1, $2, $3)",
          [item.order_id, item.product_id, item.price]
        );
      }

      // Clear cart
      await client.query("DELETE FROM cart WHERE user_id = $1", [user_id]);

      await client.query("COMMIT");
      res.json({ message: "Заказ успешно создан" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка базы данных" });
  }
});

app.post("/api/cart/save-dates", async (req, res) => {
  const user_id = req.cookies.user_id;
  if (!user_id) {
    return res.status(401).json({
      error: "Not authenticated",
      redirect: "/login.html",
    });
  }

  const { rental_start, rental_end } = req.body;
  if (!rental_start || !rental_end) {
    return res.status(400).json({ error: "Даты обязательны" });
  }

  try {
    await pool.query(
      `INSERT INTO rental_dates (user_id, start_date, end_date) 
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET start_date = $2, end_date = $3`,
      [user_id, rental_start, rental_end]
    );

    res.json({ message: "Даты сохранены успешно" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка базы данных" });
  }
});

app.get("/api/orders", async (req, res) => {
  const user_id = req.cookies.user_id;
  if (!user_id) {
    return res.status(401).send("Unauthorized");
  }

  try {
    // Get orders
    const { rows: orders } = await pool.query(
      "SELECT * FROM orders WHERE user_id = $1 ORDER BY order_date DESC",
      [user_id]
    );

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const { rows: orderItems } = await pool.query(
          `SELECT oi.*, p.name, p.image, p.price 
           FROM order_items oi 
           JOIN product p ON oi.product_id = p.id 
           WHERE oi.order_id = $1`,
          [order.id]
        );

        return {
          ...order,
          items: orderItems,
        };
      })
    );

    const ordersHtml = ordersWithItems
      .map(
        (order) => `
        <div class="order-card">
          <div class="order-header">
            <div class="order-info">
              <div class="order-date">
                <i class="far fa-calendar"></i>
                ${new Date(order.order_date).toLocaleDateString("ru-RU")}
              </div>
              <div class="order-payment">
                <i class="fas fa-credit-card"></i>
                ${
                  order.payment_method === "card"
                    ? "💳 Банковская карта"
                    : "💵 Наличные"
                }
              </div>
            </div>
            <div class="order-total">
              ${order.total_amount.toLocaleString("ru-RU")} ₽
            </div>
          </div>
          <div class="order-items">
            ${order.items
              .map(
                (item) => `
              <div class="order-item">
                <img src="${item.image}" alt="${item.name}" />
                <div class="order-item-info">
                  <div class="order-item-name">${item.name}</div>
                  <div class="order-item-details">
                    <span>${item.price.toLocaleString("ru-RU")} ₽</span>
                  </div>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `
      )
      .join("");

    res.send(ordersHtml || "<p>У вас пока нет заказов</p>");
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Error fetching orders");
  }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";

app.listen(PORT, HOST, () => {
  console.log(`Сервер запущен на http://${HOST}:${PORT}`);
});
