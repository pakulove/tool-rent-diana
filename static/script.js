
// Инициализация страницы в зависимости от её типа
document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.getAttribute('data-page');

    if (page === 'cart') {
        displayCart(); // Отображаем корзину, если это страница корзины
    }
});



// Проверяем, есть ли корзина в localStorage
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Функция добавления в корзину
document.addEventListener("DOMContentLoaded", function () {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    function addToCart(name, quantity, price) {
        let cart = JSON.parse(localStorage.getItem("cart")) || [];
        let existingItem = cart.find(item => item.name === name);
    
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({ name, quantity, price });
        }
    
        localStorage.setItem("cart", JSON.stringify(cart));
        updateCart();
    
        // Показываем уведомление
        showNotification(`Добавлено в корзину: ${name}`);
    }
    

    function updateCart() {
        let cartContainer = document.getElementById("cart-items");
        let totalPriceElement = document.getElementById("total-price");

        if (!cartContainer || !totalPriceElement) {
            console.error("Ошибка: контейнер корзины не найден!");
            return;
        }

        cartContainer.innerHTML = "";
        let total = 0;

        cart.forEach((item, index) => {
            let itemElement = document.createElement("div");
            itemElement.classList.add("cart-item");
            itemElement.innerHTML = `
                <p>${item.name} (x${item.quantity}) - ${item.price * item.quantity} ₽</p>
                <button onclick="removeFromCart(${index})">❌</button>
            `;
            cartContainer.appendChild(itemElement);
            total += item.price * item.quantity;
        });

        totalPriceElement.textContent = `Итого: ${total} ₽`;
    }

    function removeFromCart(index) {
        cart.splice(index, 1);
        localStorage.setItem("cart", JSON.stringify(cart));
        updateCart();
    }

    function clearCart() {
        cart = [];
        localStorage.removeItem("cart");
        updateCart();
    }

    // Привязываем кнопку очистки корзины
    let clearButton = document.getElementById("clear-cart");
    if (clearButton) {
        clearButton.addEventListener("click", clearCart);
    }

    // Навешиваем обработчики событий на все кнопки "Добавить в корзину"
    document.querySelectorAll(".tool-item button").forEach(button => {
        button.addEventListener("click", function () {
            let item = this.closest(".tool-item");
            let name = item.querySelector("h2").textContent;
            let priceText = item.querySelector("p").textContent;
            let price = parseInt(priceText.match(/\d+/)[0]); // Извлекаем число из текста "Цена: 500 ₽/день"

            addToCart(name, 1, price);
        });
    });

    updateCart();
});




// Функция обновления корзины
function updateCart() {
    let cartContainer = document.getElementById("cart-items");
    let totalPriceElement = document.getElementById("total-price");

    if (!cartContainer || !totalPriceElement) {
        console.error("Ошибка: контейнер корзины не найден!");
        return;
    }

    cartContainer.innerHTML = ""; // Очищаем перед обновлением

    let total = 0;

    cart.forEach((item, index) => {
        let itemElement = document.createElement("div");
        itemElement.classList.add("cart-item");
        itemElement.innerHTML = `
            <p>${item.name} (x${item.quantity}) - ${item.price * item.quantity} ₽</p>
            <button onclick="removeFromCart(${index})">❌</button>
        `;
        cartContainer.appendChild(itemElement);
        total += item.price * item.quantity;
    });

    totalPriceElement.textContent = `Итого: ${total} ₽`;
}

// Функция удаления из корзины
function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCart();
}

// Загружаем корзину при загрузке страницы
document.addEventListener("DOMContentLoaded", updateCart);






// Функция для отображения корзины
function displayCart() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartItemsDiv = document.getElementById('cart-items');
    const rentalFormDiv = document.getElementById('rental-form');

    if (!cartItemsDiv || !rentalFormDiv) {
        console.error('Не найдены элементы корзины.');
        return;
    }

    cartItemsDiv.innerHTML = ''; // Очищаем перед добавлением

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p>Корзина пуста.</p>';
        rentalFormDiv.innerHTML = ''; // Убираем форму, если корзина пустая
        calculateTotal(); // Обновляем итоговую сумму
        return;
    }

    cart.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('cart-item');

        const itemName = document.createElement('span');
        itemName.textContent = `${item.toolName} (x${item.quantity})`;

        const quantityDiv = document.createElement('div');
        quantityDiv.classList.add('quantity-controls');

        const minusButton = document.createElement('button');
        minusButton.textContent = '-';
        minusButton.onclick = () => updateQuantity(index, -1);

        const plusButton = document.createElement('button');
        plusButton.textContent = '+';
        plusButton.onclick = () => updateQuantity(index, 1);

        quantityDiv.appendChild(minusButton);
        quantityDiv.appendChild(plusButton);

        const priceSpan = document.createElement('span');
        priceSpan.textContent = `${item.quantity * item.price} ₽`;

        itemDiv.appendChild(itemName);
        itemDiv.appendChild(quantityDiv);
        itemDiv.appendChild(priceSpan);

        cartItemsDiv.appendChild(itemDiv);
    });

    // Вызываем пересчёт итоговой стоимости
    calculateTotal();
}







// Функция для изменения количества товаров в корзине
function updateQuantity(index, change) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];

    if (cart[index]) {
        cart[index].quantity += change;

        // Удаляем товар, если его количество становится 0 или меньше
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }

        // Сохраняем обновлённую корзину и обновляем отображение
        localStorage.setItem('cart', JSON.stringify(cart));
        displayCart(); // Тут вызываем функцию, чтобы обновить сумму
    }
}


// Функция для очистки корзины
function clearCart() {
    cart = []; // Очищаем массив корзины
    localStorage.removeItem("cart"); // Удаляем данные из localStorage
    updateCart(); // Обновляем корзину на странице
}

// Добавляем кнопку очистки в HTML
document.addEventListener("DOMContentLoaded", function () {
    let clearButton = document.getElementById("clear-cart");
    if (clearButton) {
        clearButton.addEventListener("click", clearCart);
    }
});


// Функция оформления заказа
function checkout() {
    const userId = localStorage.getItem('userId');

    if (!userId) {
        showNotification('Для оформления заказа необходимо войти в систему.');
        window.location.href = 'login.html'; // Перенаправляем на страницу входа
        return;
    }

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        showNotification('Корзина пуста. Добавьте товары перед оформлением.');
        return;
    }

    // Отправка данных корзины на сервер (заглушка)
    fetch('http://localhost:3000/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, cart }),
    })
        .then(response => response.json())
        .then(data => {
            showNotification(data.message || 'Заказ успешно оформлен!');
            localStorage.removeItem('cart'); // Очищаем корзину
            displayCart(); // Обновляем корзину
        })
        .catch(error => console.error('Ошибка при оформлении заказа:', error));
}

//Функция для показа уведомлений
function showNotification(message) {
    const container = document.getElementById('notifications-container');

    if (!container) {
        console.error("Ошибка: контейнер для уведомлений не найден!");
        return;
    }

    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.textContent = message;

    container.appendChild(notification);

    // Удаляем уведомление после завершения анимации
    setTimeout(() => {
        notification.remove();
    }, 4000);
}



    //Функция сохранения даты с заказом
    function saveRentalDates() {
        const startDate = document.getElementById('rental-start').value;
        const endDate = document.getElementById('rental-end').value;
    
        if (!startDate || !endDate) {
            alert('Пожалуйста, выберите даты аренды!');
            return;
        }
    
        localStorage.setItem('rentalStart', startDate);
        localStorage.setItem('rentalEnd', endDate);
    
        alert(`Даты аренды сохранены: ${startDate} - ${endDate}`);
    }
    
    // Функция подсчета общей стоимости
    function calculateTotal() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const totalPriceElement = document.getElementById("total-price");
    
        if (!totalPriceElement) {
            console.error('Не найден элемент с id "total-price".');
            return;
        }
    
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        totalPriceElement.textContent = `Итого: ${total} ₽`;
    }
    
   