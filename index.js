const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use(express.static("static"));

// Database connection
const db = new sqlite3.Database("materials.db", (err) => {
  if (err) {
    console.error("Error connecting to database:", err);
  } else {
    console.log("Connected to SQLite database");
  }
});

// Auth endpoints
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Имя пользователя и пароль обязательны" });
  }

  // Check if user already exists
  db.get(
    "SELECT id FROM user WHERE username = ?",
    [username],
    async (err, user) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Ошибка базы данных" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      db.run(
        "INSERT INTO user (username, password) VALUES (?, ?)",
        [username, hashedPassword],
        function (err) {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: "Ошибка базы данных" });
          }

          // Set cookie
          res.cookie("user_id", this.lastID, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
          });

          res.json({ message: "Регистрация прошла успешно" });
        }
      );
    }
  );
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  // Get user
  db.get(
    "SELECT id, password FROM user WHERE username = ?",
    [username],
    async (err, user) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Ошибка базы данных" });
      }

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
    }
  );
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("user_id");
  res.send('<a href="/login.html">Войти</a>');
});

// Get current user
app.get("/api/auth/me", (req, res) => {
  const user_id = req.cookies.user_id;
  if (!user_id) {
    return res.send('<a href="/login.html">Войти</a>');
  }

  db.get(
    "SELECT id, username FROM user WHERE id = ?",
    [user_id],
    (err, user) => {
      if (err) {
        console.error(err);
        return res.send('<a href="/login.html">Войти</a>');
      }

      if (!user) {
        res.clearCookie("user_id");
        return res.send('<a href="/login.html">Войти</a>');
      }

      res.send(`
        <span>Привет, ${user.username}!</span>
        <a href="#" onclick="document.body.dispatchEvent(new Event('cart-updated')); fetch('/api/auth/logout', {method: 'POST'}).then(() => window.location.reload())">Выйти</a>
      `);
    }
  );
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "static/index.html"));
});

// Get products list
app.get("/api/products", (req, res) => {
  db.all("SELECT * FROM product", [], (err, products) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Ошибка базы данных");
    }

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
  });
});

// Cart API endpoints
app.get("/api/cart/items", (req, res) => {
  const user_id = req.cookies.user_id;
  if (!user_id) {
    return res.status(401).json({
      error: "Not authenticated",
      redirect: "/login.html",
    });
  }

  db.all(
    `
        SELECT c.id, p.name, p.price, p.image
        FROM cart c
        JOIN product p ON c.product_id = p.id
        WHERE c.user_id = ?
    `,
    [user_id],
    (err, items) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Database error");
      }

      const total = items.reduce((sum, item) => sum + item.price, 0);

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
    }
  );
});

app.post("/api/cart/add", (req, res) => {
  const user_id = req.cookies.user_id;
  if (!user_id) {
    return res.status(401).json({
      error: "Not authenticated",
      redirect: "/login.html",
    });
  }

  const { product_id } = req.body;

  db.get(
    "SELECT id FROM product WHERE id = ?",
    [product_id],
    (err, product) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Ошибка базы данных" });
      }

      if (!product) {
        return res.status(404).json({ error: "Товар не найден" });
      }

      db.run(
        "INSERT INTO cart (user_id, product_id) VALUES (?, ?)",
        [user_id, product_id],
        (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: "Ошибка базы данных" });
          }
          res.sendStatus(204);
        }
      );
    }
  );
});

app.delete("/api/cart/remove/:id", (req, res) => {
  const user_id = req.cookies.user_id;
  if (!user_id) {
    return res.status(401).json({ error: "Не авторизован" });
  }

  db.run(
    "DELETE FROM cart WHERE id = ? AND user_id = ?",
    [req.params.id, user_id],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Ошибка базы данных" });
      }
      res.sendStatus(204);
    }
  );
});

app.post("/api/cart/clear", (req, res) => {
  const user_id = req.cookies.user_id;
  if (!user_id) {
    return res.status(401).json({ error: "Не авторизован" });
  }

  db.run("DELETE FROM cart WHERE user_id = ?", [user_id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Ошибка базы данных" });
    }
    res.sendStatus(204);
  });
});

app.post("/api/cart/checkout", (req, res) => {
  const user_id = req.cookies.user_id;
  if (!user_id) {
    return res.status(401).json({ error: "Не авторизован" });
  }

  db.all(
    `
        SELECT c.id, p.name, p.price
        FROM cart c
        JOIN product p ON c.product_id = p.id
        WHERE c.user_id = ?
    `,
    [user_id],
    (err, items) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Ошибка базы данных" });
      }

      if (items.length === 0) {
        return res.status(400).json({ error: "Корзина пуста" });
      }

      const total = items.reduce((sum, item) => sum + item.price, 0);

      db.run("BEGIN TRANSACTION");

      db.run(
        `
            INSERT INTO orders (user_id, order_date, total_amount)
            VALUES (?, datetime('now'), ?)
        `,
        [user_id, total],
        function (err) {
          if (err) {
            db.run("ROLLBACK");
            console.error(err);
            return res.status(500).json({ error: "Ошибка базы данных" });
          }

          const order_id = this.lastID;
          let completed = 0;

          items.forEach((item) => {
            db.run(
              `
                    INSERT INTO order_items (order_id, product_id, price)
                    VALUES (?, ?, ?)
                `,
              [order_id, item.id, item.price],
              (err) => {
                if (err) {
                  db.run("ROLLBACK");
                  console.error(err);
                  return res.status(500).json({ error: "Ошибка базы данных" });
                }

                completed++;
                if (completed === items.length) {
                  db.run(
                    "DELETE FROM cart WHERE user_id = ?",
                    [user_id],
                    (err) => {
                      if (err) {
                        db.run("ROLLBACK");
                        console.error(err);
                        return res
                          .status(500)
                          .json({ error: "Ошибка базы данных" });
                      }

                      db.run("COMMIT");
                      res.json({ message: "Заказ успешно создан" });
                    }
                  );
                }
              }
            );
          });
        }
      );
    }
  );
});

app.post("/api/cart/save-dates", (req, res) => {
  const user_id = req.cookies.user_id;
  if (!user_id) {
    return res.status(401).json({ error: "Не авторизован" });
  }

  const { rental_start, rental_end } = req.body;
  if (!rental_start || !rental_end) {
    return res.status(400).json({ error: "Даты обязательны" });
  }

  db.run(
    `
        INSERT OR REPLACE INTO rental_dates (user_id, start_date, end_date)
        VALUES (?, ?, ?)
    `,
    [user_id, rental_start, rental_end],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Ошибка базы данных" });
      }
      res.json({ message: "Даты сохранены успешно" });
    }
  );
});

const PORT = 3000;
const HOST = "localhost";

app.listen(PORT, HOST, () => {
  console.log(`Сервер запущен на http://${HOST}:${PORT}`);
});
