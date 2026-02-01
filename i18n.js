// Internationalization data
const translations = {
    en: {
        nav: {
            home: "Home",
            products: "Virtual Cards",
            about: "About",
            contact: "Contact"
        },
        hero: {
            title: "Purchase Virtual Cards Globally",
            subtitle: "Instant delivery • Secure payments • Multiple currencies",
            cta: "Browse Cards"
        },
        features: {
            title: "Why Choose CardVela?",
            instant: {
                title: "Instant Delivery",
                desc: "Receive your virtual card details immediately after purchase"
            },
            secure: {
                title: "Secure & Safe",
                desc: "Bank-level encryption and secure payment processing"
            },
            global: {
                title: "Global Access",
                desc: "Use cards worldwide for online purchases"
            },
            currency: {
                title: "Multiple Currencies",
                desc: "Support for USD, EUR, GBP, CNY and more"
            }
        },
        popular: {
            title: "Popular Virtual Cards",
            viewAll: "View All Cards"
        },
        products: {
            title: "Virtual Cards Marketplace",
            subtitle: "Choose from our selection of international virtual cards"
        },
        filters: {
            currency: "Currency:",
            amount: "Amount:",
            all: "All"
        },
        card: {
            addToCart: "Add to Cart"
        },
        cart: {
            title: "Shopping Cart",
            total: "Total:",
            checkout: "Checkout",
            empty: "Your cart is empty",
            remove: "Remove"
        },
        about: {
            title: "About CardVela",
            description: "CardVela is your trusted international marketplace for virtual cards. We provide instant access to prepaid virtual cards for online shopping, subscriptions, and secure payments worldwide."
        },
        contact: {
            title: "Contact Us",
            email: "Email: support@cardvela.com",
            hours: "Available 24/7"
        },
        footer: {
            rights: "All rights reserved."
        },
        checkout: {
            success: "Order placed successfully! Check your email for card details.",
            emptyCart: "Your cart is empty"
        }
    },
    zh: {
        nav: {
            home: "首页",
            products: "虚拟卡",
            about: "关于",
            contact: "联系"
        },
        hero: {
            title: "全球购买虚拟卡",
            subtitle: "即时交付 • 安全支付 • 多币种支持",
            cta: "浏览卡片"
        },
        features: {
            title: "为什么选择CardVela？",
            instant: {
                title: "即时交付",
                desc: "购买后立即收到您的虚拟卡详细信息"
            },
            secure: {
                title: "安全可靠",
                desc: "银行级加密和安全支付处理"
            },
            global: {
                title: "全球访问",
                desc: "在全球范围内进行在线购物"
            },
            currency: {
                title: "多币种",
                desc: "支持美元、欧元、英镑、人民币等"
            }
        },
        popular: {
            title: "热门虚拟卡",
            viewAll: "查看所有卡片"
        },
        products: {
            title: "虚拟卡市场",
            subtitle: "从我们的国际虚拟卡选择中选择"
        },
        filters: {
            currency: "货币：",
            amount: "金额：",
            all: "全部"
        },
        card: {
            addToCart: "加入购物车"
        },
        cart: {
            title: "购物车",
            total: "总计：",
            checkout: "结账",
            empty: "您的购物车是空的",
            remove: "移除"
        },
        about: {
            title: "关于CardVela",
            description: "CardVela是您值得信赖的国际虚拟卡市场。我们为全球在线购物、订阅和安全支付提供即时访问的预付虚拟卡。"
        },
        contact: {
            title: "联系我们",
            email: "电子邮件：support@cardvela.com",
            hours: "全天候服务"
        },
        footer: {
            rights: "保留所有权利。"
        },
        checkout: {
            success: "订单已成功下单！请查看您的电子邮件以获取卡片详细信息。",
            emptyCart: "您的购物车是空的"
        }
    }
};

// Current language
let currentLanguage = 'en';

// Initialize language from localStorage or default to English
function initLanguage() {
    const savedLanguage = localStorage.getItem('language') || 'en';
    currentLanguage = savedLanguage;
    document.getElementById('languageSelect').value = savedLanguage;
    updatePageContent();
}

// Change language
function changeLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    updatePageContent();
}

// Update all elements with data-i18n attribute
function updatePageContent() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        const keys = key.split('.');
        let translation = translations[currentLanguage];
        
        for (const k of keys) {
            translation = translation[k];
        }
        
        if (translation) {
            element.textContent = translation;
        }
    });
}

// Get translation for a key
function t(key) {
    const keys = key.split('.');
    let translation = translations[currentLanguage];
    
    for (const k of keys) {
        translation = translation[k];
    }
    
    return translation || key;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initLanguage);
