const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const supabase = require("./config");
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
    const { data: existingUser, error: checkError } = await supabase
      .from("user")
      .select("id")
      .eq("username", username)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    if (existingUser) {
      return res.status(400).json({ error: "Пользователь уже существует" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const { data: newUser, error: createError } = await supabase
      .from("user")
      .insert([{ username, password: hashedPassword }])
      .select()
      .single();

    if (createError) throw createError;

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
    const { data: user, error } = await supabase
      .from("user")
      .select("id, password")
      .eq("username", username)
      .single();

    if (error) throw error;

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

app.get("/api/auth/me", (req, res) => {
  const userId = req.cookies.user_id;
  if (userId) {
    const user = supabase
      .from("user")
      .select("username")
      .eq("id", userId)
      .single();
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
    const { data: products, error } = await supabase
      .from("product")
      .select("*");

    if (error) throw error;

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

// Добавим новый эндпоинт для получения категорий
app.get("/api/categories", async (req, res) => {
  try {
    console.log("Fetching categories from product table...");

    const { data: products, error } = await supabase
      .from("product")
      .select("category");

    console.log("Supabase response:", { products, error });

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    // Получаем уникальные категории и сортируем их
    const categories = [...new Set(products.map((p) => p.category))]
      .filter(Boolean)
      .sort();
    console.log("Extracted categories:", categories);

    // Генерируем HTML для select
    const options = categories
      .map((category) => `<option value="${category}">${category}</option>`)
      .join("");

    console.log("Generated HTML:", options);
    res.send(options);
  } catch (error) {
    console.error("Error in /api/categories:", error);
    res.status(500).send("Error fetching categories");
  }
});

// Обновим эндпоинт получения цен для поддержки фильтрации
app.get("/api/prices", async (req, res) => {
  const { category } = req.query;

  try {
    let query = supabase.from("product").select("*");

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data: products, error } = await query;

    if (error) throw error;

    // Генерируем HTML для списка продуктов
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
    const { data: items, error } = await supabase
      .from("cart")
      .select(
        `
        id,
        product:product_id (
          name,
          price,
          image
        )
      `
      )
      .eq("user_id", user_id);

    if (error) throw error;

    const total = items.reduce((sum, item) => sum + item.product.price, 0);

    let html = "";
    items.forEach((item) => {
      html += `
        <div class="cart-item">
          <img src="${item.product.image}" alt="${item.product.name}" style="width: 50px; height: 50px;">
          <span>${item.product.name}</span>
          <span>${item.product.price} ₽</span>
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
    const { data: product, error: productError } = await supabase
      .from("product")
      .select("id")
      .eq("id", product_id)
      .single();

    if (productError) throw productError;

    if (!product) {
      return res.status(404).json({ error: "Товар не найден" });
    }

    // Add to cart
    const { error: insertError } = await supabase
      .from("cart")
      .insert([{ user_id, product_id }]);

    if (insertError) throw insertError;

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
    const { error } = await supabase
      .from("cart")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", user_id);

    if (error) throw error;

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
    const { error } = await supabase
      .from("cart")
      .delete()
      .eq("user_id", user_id);

    if (error) throw error;

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
    const { data: items, error: itemsError } = await supabase
      .from("cart")
      .select(
        `
        id,
        product:product_id (
          id,
          name,
          price
        )
      `
      )
      .eq("user_id", user_id);

    if (itemsError) throw itemsError;

    if (items.length === 0) {
      return res.status(400).json({ error: "Корзина пуста" });
    }

    const total = items.reduce((sum, item) => sum + item.product.price, 0);

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([
        {
          user_id,
          total_amount: total,
          order_date: new Date().toISOString(),
          rental_start: start_date,
          rental_end: end_date,
          payment_method,
        },
      ])
      .select()
      .single();

    if (orderError) throw orderError;

    // Add order items
    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.product.id,
      price: item.product.price,
      quantity: 1,
    }));

    const { error: itemsInsertError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsInsertError) throw itemsInsertError;

    // Clear cart
    const { error: clearError } = await supabase
      .from("cart")
      .delete()
      .eq("user_id", user_id);

    if (clearError) throw clearError;

    res.json({ message: "Заказ успешно создан" });
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
    const { error } = await supabase.from("rental_dates").upsert(
      [
        {
          user_id,
          start_date: rental_start,
          end_date: rental_end,
        },
      ],
      {
        onConflict: "user_id",
      }
    );

    if (error) throw error;

    res.json({ message: "Даты сохранены успешно" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка базы данных" });
  }
});

// Добавим новый эндпоинт для получения истории заказов
app.get("/api/orders", async (req, res) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    // Получаем заказы пользователя
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("order_date", { ascending: false });

    if (ordersError) throw ordersError;

    // Для каждого заказа получаем его товары
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const { data: orderItems, error: itemsError } = await supabase
          .from("order_items")
          .select(
            `
            *,
            product:product_id (
              name,
              image,
              price
            )
          `
          )
          .eq("order_id", order.id);

        if (itemsError) throw itemsError;

        return {
          ...order,
          items: orderItems,
        };
      })
    );

    // Формируем HTML для отображения заказов
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
                <img src="${item.product.image}" alt="${item.product.name}" />
                <div class="order-item-info">
                  <div class="order-item-name">${item.product.name}</div>
                  <div class="order-item-details">
                    <span>${item.quantity} шт.</span>
                    <span>${item.product.price.toLocaleString("ru-RU")} ₽</span>
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
