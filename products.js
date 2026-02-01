// Products page functionality
let filteredCards = [...virtualCards];

// Load all products
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
});

// Load products into grid
function loadProducts() {
    const productsGrid = document.getElementById('productsGrid');
    
    if (productsGrid) {
        if (filteredCards.length === 0) {
            productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">No cards found matching your filters.</p>';
            return;
        }
        
        productsGrid.innerHTML = filteredCards.map(card => `
            <div class="card">
                <div class="card-image">${card.icon}</div>
                <div class="card-content">
                    <h3 class="card-title">${card.name}</h3>
                    <p class="card-description">${card.description}</p>
                    <div class="card-meta">
                        <span class="card-price">${getCurrencySymbol(card.currency)}${card.price}</span>
                        <span class="card-currency">${card.currency}</span>
                    </div>
                    <button class="add-to-cart" onclick="addToCart(${card.id})" data-i18n="card.addToCart">Add to Cart</button>
                </div>
            </div>
        `).join('');
        
        // Update translations after adding content
        updatePageContent();
    }
}

// Filter products
function filterProducts() {
    const currencyFilter = document.getElementById('currencyFilter').value;
    const amountFilter = document.getElementById('amountFilter').value;
    
    filteredCards = virtualCards.filter(card => {
        // Currency filter
        if (currencyFilter !== 'all' && card.currency !== currencyFilter) {
            return false;
        }
        
        // Amount filter (convert all to USD equivalent for comparison)
        if (amountFilter !== 'all') {
            const usdEquivalent = convertToUSD(card.price, card.currency);
            const [min, max] = amountFilter.includes('+') 
                ? [parseInt(amountFilter), Infinity]
                : amountFilter.split('-').map(Number);
            
            if (usdEquivalent < min || usdEquivalent > max) {
                return false;
            }
        }
        
        return true;
    });
    
    loadProducts();
}

// Convert to USD for filtering (approximate rates)
function convertToUSD(amount, currency) {
    const rates = {
        'USD': 1,
        'EUR': 1.1,
        'GBP': 1.3,
        'CNY': 0.14
    };
    return amount * rates[currency];
}
