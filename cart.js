// Virtual cards data
const virtualCards = [
    {
        id: 1,
        name: "USD Virtual Card - $25",
        description: "Perfect for small online purchases",
        price: 25,
        currency: "USD",
        icon: "💵"
    },
    {
        id: 2,
        name: "USD Virtual Card - $50",
        description: "Ideal for subscriptions and services",
        price: 50,
        currency: "USD",
        icon: "💵"
    },
    {
        id: 3,
        name: "USD Virtual Card - $100",
        description: "Great for larger purchases",
        price: 100,
        currency: "USD",
        icon: "💵"
    },
    {
        id: 4,
        name: "EUR Virtual Card - €25",
        description: "For European online stores",
        price: 25,
        currency: "EUR",
        icon: "💶"
    },
    {
        id: 5,
        name: "EUR Virtual Card - €50",
        description: "Popular choice for EU services",
        price: 50,
        currency: "EUR",
        icon: "💶"
    },
    {
        id: 6,
        name: "EUR Virtual Card - €100",
        description: "Premium European card",
        price: 100,
        currency: "EUR",
        icon: "💶"
    },
    {
        id: 7,
        name: "GBP Virtual Card - £25",
        description: "UK online shopping made easy",
        price: 25,
        currency: "GBP",
        icon: "💷"
    },
    {
        id: 8,
        name: "GBP Virtual Card - £50",
        description: "British pound prepaid card",
        price: 50,
        currency: "GBP",
        icon: "💷"
    },
    {
        id: 9,
        name: "CNY Virtual Card - ¥200",
        description: "For Chinese online platforms",
        price: 200,
        currency: "CNY",
        icon: "💴"
    },
    {
        id: 10,
        name: "CNY Virtual Card - ¥500",
        description: "Popular in Chinese market",
        price: 500,
        currency: "CNY",
        icon: "💴"
    },
    {
        id: 11,
        name: "USD Virtual Card - $250",
        description: "Business and enterprise ready",
        price: 250,
        currency: "USD",
        icon: "💵"
    },
    {
        id: 12,
        name: "USD Virtual Card - $500",
        description: "Premium high-value card",
        price: 500,
        currency: "USD",
        icon: "💵"
    }
];

// Cart management
let cart = [];

// Load cart from localStorage
function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
    updateCartUI();
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
}

// Add item to cart
function addToCart(cardId) {
    const card = virtualCards.find(c => c.id === cardId);
    if (card) {
        cart.push({...card, cartId: Date.now()});
        saveCart();
        
        // Show feedback
        showNotification(t('card.addToCart') + ' ✓');
        
        // Open cart
        setTimeout(() => {
            toggleCart(true);
        }, 300);
    }
}

// Remove item from cart
function removeFromCart(cartId) {
    cart = cart.filter(item => item.cartId !== cartId);
    saveCart();
}

// Update cart UI
function updateCartUI() {
    // Update cart count
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.textContent = cart.length;
    }

    // Update cart items
    const cartItems = document.getElementById('cartItems');
    if (cartItems) {
        if (cart.length === 0) {
            cartItems.innerHTML = `<div class="empty-cart">${t('cart.empty')}</div>`;
        } else {
            cartItems.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <div>
                        <div class="cart-item-info">
                            <h4>${item.name}</h4>
                            <p>${item.description}</p>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span class="cart-item-price">${getCurrencySymbol(item.currency)}${item.price}</span>
                        <button class="remove-item" onclick="removeFromCart(${item.cartId})">${t('cart.remove')}</button>
                    </div>
                </div>
            `).join('');
        }
    }

    // Update cart total
    const cartTotal = document.getElementById('cartTotal');
    if (cartTotal) {
        const total = calculateTotal();
        cartTotal.textContent = total;
    }
}

// Calculate cart total
function calculateTotal() {
    if (cart.length === 0) return '$0.00';
    
    // Group by currency
    const totals = {};
    cart.forEach(item => {
        if (!totals[item.currency]) {
            totals[item.currency] = 0;
        }
        totals[item.currency] += item.price;
    });

    // Format totals
    return Object.entries(totals)
        .map(([currency, amount]) => `${getCurrencySymbol(currency)}${amount}`)
        .join(' + ');
}

// Get currency symbol
function getCurrencySymbol(currency) {
    const symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'CNY': '¥'
    };
    return symbols[currency] || currency;
}

// Toggle cart sidebar
function toggleCart(forceOpen = null) {
    const cartSidebar = document.getElementById('cartSidebar');
    if (forceOpen !== null) {
        if (forceOpen) {
            cartSidebar.classList.add('open');
        } else {
            cartSidebar.classList.remove('open');
        }
    } else {
        cartSidebar.classList.toggle('open');
    }
}

// Checkout
function checkout() {
    if (cart.length === 0) {
        alert(t('checkout.emptyCart'));
        return;
    }

    // Simulate checkout process
    alert(t('checkout.success'));
    
    // Clear cart
    cart = [];
    saveCart();
    toggleCart(false);
}

// Show notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem 2rem;
        border-radius: 4px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 3000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', loadCart);
