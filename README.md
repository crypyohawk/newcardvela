# CardVela - 国际虚拟卡交易平台

一个出售虚拟卡的国际网站 (An international website for selling virtual cards)

## 功能特点 (Features)

- 🌍 **国际化支持** - 支持英文和中文界面
- 💳 **多币种虚拟卡** - 支持美元、欧元、英镑、人民币
- 🛒 **购物车功能** - 完整的购物车和结账流程
- 📱 **响应式设计** - 适配手机、平板和桌面设备
- ⚡ **即时交付** - 购买后立即获取卡片信息
- 🔒 **安全可靠** - 银行级加密和安全支付

## 技术栈 (Technology Stack)

- HTML5
- CSS3 (现代响应式设计)
- JavaScript (原生 ES6+)
- 本地存储 (LocalStorage)

## 文件结构 (File Structure)

```
newcardvela/
├── index.html          # 主页
├── products.html       # 产品列表页
├── styles.css          # 样式表
├── i18n.js            # 国际化支持
├── cart.js            # 购物车功能
├── app.js             # 主页逻辑
├── products.js        # 产品页逻辑
└── README.md          # 说明文档
```

## 使用方法 (Usage)

1. 直接在浏览器中打开 `index.html` 文件
2. 或使用本地服务器：
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js
   npx http-server
   ```
3. 访问 http://localhost:8000

## 功能说明 (Functionality)

### 主页 (Homepage)
- 展示网站特点和优势
- 显示热门虚拟卡产品
- 提供语言切换功能

### 产品页 (Products Page)
- 完整的虚拟卡目录
- 按货币和金额筛选
- 加入购物车功能

### 购物车 (Shopping Cart)
- 侧边栏购物车
- 实时更新总价
- 支持多币种混合结算
- 持久化存储（刷新不丢失）

### 国际化 (Internationalization)
- 英文 (English)
- 中文 (Chinese)
- 自动保存语言偏好

## 浏览器支持 (Browser Support)

- Chrome (推荐)
- Firefox
- Safari
- Edge
- 移动浏览器

## License

MIT License
