// Load popular cards on homepage
document.addEventListener('DOMContentLoaded', function() {
    const popularCardsContainer = document.getElementById('popularCards');
    
    if (popularCardsContainer) {
        // Show first 3 cards as popular
        const popularCards = virtualCards.slice(0, 3);
        
        popularCardsContainer.innerHTML = popularCards.map(card => `
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
});
