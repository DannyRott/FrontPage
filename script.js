/**
 * Aura Storefront - Core Logic
 * Plain vanilla JavaScript, localStorage persistence, client-side image compression
 */

(function () {
  'use strict';

  // --- Constants & Storage Keys ---
  const STORAGE_KEYS = {
    PRODUCTS: 'aura_storefront_products',
    CATEGORIES: 'aura_storefront_categories',
    ADMIN_AUTH: 'aura_storefront_admin_auth',
  };

  const DEFAULT_CATEGORIES = [
    'Electronics',
    'Fashion',
    'Home & Living',
    'Accessories'
  ];

  // --- State ---
  let products = [];
  let categories = [];
  let activeCategory = 'All';
  let pendingImageBase64 = null; // Stored when user selects/drops a file

  /**
   * Checks whether the current session has active admin privileges.
   */
  function isAdmin() {
    return sessionStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true';
  }

  // --- DOM Elements ---
  const adminBadge = document.getElementById('adminBadge');
  const btnAdminLogin = document.getElementById('btnAdminLogin');
  const btnAdminLogout = document.getElementById('btnAdminLogout');
  const loginModal = document.getElementById('loginModal');
  const loginForm = document.getElementById('loginForm');
  const adminUsernameInput = document.getElementById('adminUsername');
  const adminPasswordInput = document.getElementById('adminPassword');
  const loginError = document.getElementById('loginError');
  const btnCloseLoginModal = document.getElementById('btnCloseLoginModal');
  const btnCancelLogin = document.getElementById('btnCancelLogin');

  const btnExportData = document.getElementById('btnExportData');
  const btnImportData = document.getElementById('btnImportData');
  const importFileInput = document.getElementById('importFileInput');

  const categoryNav = document.getElementById('categoryNav');
  const productGrid = document.getElementById('productGrid');
  const emptyState = document.getElementById('emptyState');
  const emptyStateTitle = document.getElementById('emptyStateTitle');
  const emptyStateDesc = document.getElementById('emptyStateDesc');
  const productCounter = document.getElementById('productCounter');
  const toastContainer = document.getElementById('toastContainer');

  // Modals
  const productModal = document.getElementById('productModal');
  const productModalTitle = document.getElementById('productModalTitle');
  const productForm = document.getElementById('productForm');
  const productIdInput = document.getElementById('productId');
  const productNameInput = document.getElementById('productName');
  const productPriceInput = document.getElementById('productPrice');
  const productCategorySelect = document.getElementById('productCategory');
  const productDescriptionInput = document.getElementById('productDescription');
  const productImageInput = document.getElementById('productImageInput');
  const imageDropzone = document.getElementById('imageDropzone');
  const dropzoneEmpty = document.getElementById('dropzoneEmpty');
  const dropzonePreview = document.getElementById('dropzonePreview');
  const imagePreviewImg = document.getElementById('imagePreviewImg');
  const imageRequiredBadge = document.getElementById('imageRequiredBadge');

  const btnOpenAddProduct = document.getElementById('btnOpenAddProduct');
  const btnEmptyAddProduct = document.getElementById('btnEmptyAddProduct');
  const btnCloseProductModal = document.getElementById('btnCloseProductModal');
  const btnCancelProduct = document.getElementById('btnCancelProduct');

  const categoryModal = document.getElementById('categoryModal');
  const btnOpenManageCategories = document.getElementById('btnOpenManageCategories');
  const btnCloseCategoryModal = document.getElementById('btnCloseCategoryModal');
  const btnCloseCategoryModalFooter = document.getElementById('btnCloseCategoryModalFooter');
  const addCategoryForm = document.getElementById('addCategoryForm');
  const newCategoryNameInput = document.getElementById('newCategoryName');
  const categoriesList = document.getElementById('categoriesList');

  // Form error spans
  const nameError = document.getElementById('nameError');
  const priceError = document.getElementById('priceError');
  const categoryError = document.getElementById('categoryError');
  const descriptionError = document.getElementById('descriptionError');
  const imageError = document.getElementById('imageError');
  const newCategoryError = document.getElementById('newCategoryError');

  // ==========================================================================
  // Image Generation & Compression Utilities
  // ==========================================================================

  /**
   * Resizes and compresses an image file to max ~600px width/height and JPEG 0.7 quality.
   */
  function compressImageFile(file, maxWidth = 600, quality = 0.7) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Please select a valid image file.'));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.onload = (event) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to decode image.'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth || height > maxWidth) {
            if (width >= height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);
          const ctx = canvas.getContext('2d');

          // White background in case of transparent PNGs
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          try {
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
          } catch (err) {
            reject(err);
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Generates a sleek, high-aesthetic Canvas placeholder image (Base64 JPEG).
   * Completely local, no external network requests needed.
   */
  function generatePlaceholderImage(title, category, colorStart, colorEnd, iconSymbol) {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');

    // Subtle gradient background
    const gradient = ctx.createLinearGradient(0, 0, 600, 450);
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(1, colorEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 450);

    // Decorative geometric ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(300, 185, 90, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.stroke();

    // Center icon/glyph
    ctx.font = '64px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(iconSymbol || '✦', 300, 185);
    ctx.restore();

    // Category Pill
    ctx.save();
    const catText = (category || 'PRODUCT').toUpperCase();
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    const catWidth = ctx.measureText(catText).width;
    const pillW = catWidth + 24;
    const pillH = 26;
    const pillX = 300 - pillW / 2;
    const pillY = 295;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 13);
      ctx.fill();
    } else {
      ctx.fillRect(pillX, pillY, pillW, pillH);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(catText, 300, pillY + pillH / 2 + 1);
    ctx.restore();

    // Product Title
    ctx.save();
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    // Truncate if long
    let displayTitle = title;
    if (displayTitle.length > 28) {
      displayTitle = displayTitle.substring(0, 26) + '...';
    }
    ctx.fillText(displayTitle, 300, 355);
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.7);
  }

  // ==========================================================================
  // Storage & Seeding Operations
  // ==========================================================================

  /**
   * Safely writes to localStorage, catching QuotaExceededError.
   */
  function safeSetStorage(key, value) {
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      return true;
    } catch (err) {
      const isQuota = (
        err.name === 'QuotaExceededError' ||
        err.code === 22 ||
        err.code === 1014 ||
        err.number === -2147024882
      );
      if (isQuota) {
        showToast('Storage limit reached! Please remove some products or upload smaller photos.', 'error');
      } else {
        showToast('Failed to save to browser storage: ' + (err.message || 'Unknown error'), 'error');
      }
      return false;
    }
  }

  /**
   * Loads or seeds data into state.
   */
  function initializeData() {
    const storedCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    const storedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);

    if (storedCategories) {
      try {
        categories = JSON.parse(storedCategories);
      } catch (e) {
        categories = [...DEFAULT_CATEGORIES];
      }
    } else {
      categories = [...DEFAULT_CATEGORIES];
      safeSetStorage(STORAGE_KEYS.CATEGORIES, categories);
    }

    if (storedProducts) {
      try {
        products = JSON.parse(storedProducts);
      } catch (e) {
        products = [];
      }
    } else {
      // Seed initial 8 sample products across 4 categories
      products = generateSeedProducts();
      safeSetStorage(STORAGE_KEYS.PRODUCTS, products);
    }
  }

  /**
   * Formats a numeric price into the standard Indian Rupee representation: e.g. "Rs. 1,499".
   * Safely handles existing strings/numbers in storage and retains decimals when present.
   */
  function formatPrice(amount) {
    const clean = typeof amount === 'string' ? amount.replace(/[^0-9.]/g, '') : amount;
    const num = Number(clean);
    if (isNaN(num)) return 'Rs. 0';
    const formatted = num.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: num % 1 !== 0 ? 2 : 0
    });
    return `Rs. ${formatted}`;
  }

  /**
   * Generates 8 diverse seeded sample products with generated canvas placeholder images.
   */
  function generateSeedProducts() {
    return [
      {
        id: 'prod_' + Date.now() + '_1',
        name: 'Wireless Noise-Canceling Headphones',
        category: 'Electronics',
        price: 1499,
        description: 'High-fidelity audio with active noise cancellation, ambient awareness mode, and 30-hour battery life.',
        image: generatePlaceholderImage('Studio Wireless Pro', 'Electronics', '#1e3a8a', '#3b82f6', '🎧')
      },
      {
        id: 'prod_' + Date.now() + '_2',
        name: 'Mechanical Gaming Keyboard',
        category: 'Electronics',
        price: 2499,
        description: 'Tactile hot-swappable mechanical switches with customizable per-key RGB backlighting and aircraft aluminum casing.',
        image: generatePlaceholderImage('Mechanical Keyboard', 'Electronics', '#312e81', '#6366f1', '⌨')
      },
      {
        id: 'prod_' + Date.now() + '_3',
        name: 'Classic Minimalist Watch',
        category: 'Accessories',
        price: 1899,
        description: 'Sleek stainless steel case with genuine vegetable-tanned leather band and precise Japanese quartz movement.',
        image: generatePlaceholderImage('Minimalist Watch', 'Accessories', '#701a75', '#d946ef', '⌚')
      },
      {
        id: 'prod_' + Date.now() + '_4',
        name: 'Heavyweight Cotton Hoodie',
        category: 'Fashion',
        price: 1299,
        description: 'Pre-shrunk 450 GSM organic French terry cotton pullover engineered for everyday relaxed streetwear comfort.',
        image: generatePlaceholderImage('Cotton Pullover', 'Fashion', '#065f46', '#10b981', '👕')
      },
      {
        id: 'prod_' + Date.now() + '_5',
        name: 'Ceramic Pour-Over Coffee Dripper',
        category: 'Home & Living',
        price: 699,
        description: 'Handcrafted heat-retaining ceramic coffee dripper featuring spiral interior extraction ribs for rich flavor.',
        image: generatePlaceholderImage('Pour-Over Dripper', 'Home & Living', '#854d0e', '#eab308', '☕')
      },
      {
        id: 'prod_' + Date.now() + '_6',
        name: 'Full-Grain Leather Daypack',
        category: 'Accessories',
        price: 2199,
        description: 'Durable full-grain leather backpack with a dedicated padded 15-inch laptop compartment and solid brass hardware.',
        image: generatePlaceholderImage('Leather Daypack', 'Accessories', '#831843', '#ec4899', '🎒')
      },
      {
        id: 'prod_' + Date.now() + '_7',
        name: 'Smart Ambient Desk Lamp',
        category: 'Home & Living',
        price: 999,
        description: 'Stepless dimming with adjustable color temperature, integrated fast wireless charging pad, and auto-off timer.',
        image: generatePlaceholderImage('Ambient Desk Lamp', 'Home & Living', '#14532d', '#22c55e', '💡')
      },
      {
        id: 'prod_' + Date.now() + '_8',
        name: 'Tailored Indigo Denim Jacket',
        category: 'Fashion',
        price: 1799,
        description: 'Classic selvedge indigo denim jacket featuring reinforced copper rivets, dual chest pockets, and waist adjusters.',
        image: generatePlaceholderImage('Denim Jacket', 'Fashion', '#0f766e', '#14b8a6', '🧥')
      }
    ];
  }

  // ==========================================================================
  // Render Functions
  // ==========================================================================

  /**
   * Renders the category filter bar tabs.
   */
  function renderCategoriesBar() {
    categoryNav.innerHTML = '';

    // "All" Tab
    const allCount = products.length;
    const allPill = createCategoryPill('All', allCount, activeCategory === 'All');
    categoryNav.appendChild(allPill);

    // Dynamic Categories
    categories.forEach((cat) => {
      const count = products.filter((p) => p.category === cat).length;
      const pill = createCategoryPill(cat, count, activeCategory === cat);
      categoryNav.appendChild(pill);
    });
  }

  function createCategoryPill(name, count, isActive) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `category-pill ${isActive ? 'active' : ''}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.innerHTML = `
      <span>${escapeHtml(name)}</span>
      <span class="category-pill-count">${count}</span>
    `;

    btn.addEventListener('click', () => {
      activeCategory = name;
      renderCategoriesBar();
      renderProductsGrid();
    });

    return btn;
  }

  /**
   * Renders the product cards grid according to current activeCategory filter.
   */
  function renderProductsGrid() {
    const filteredProducts = activeCategory === 'All'
      ? products
      : products.filter((p) => p.category === activeCategory);

    // Update Counter text
    const totalMatching = filteredProducts.length;
    productCounter.textContent = `Showing ${totalMatching} ${totalMatching === 1 ? 'product' : 'products'}`;

    if (totalMatching === 0) {
      productGrid.innerHTML = '';
      emptyState.style.display = 'block';
      btnEmptyAddProduct.style.display = isAdmin() ? 'inline-block' : 'none';
      if (activeCategory === 'All') {
        emptyStateTitle.textContent = isAdmin() ? 'Your catalog is empty' : 'No products available';
        emptyStateDesc.textContent = isAdmin()
          ? 'Get started by adding your first product to the storefront.'
          : 'There are currently no products available in the store.';
      } else {
        emptyStateTitle.textContent = `No products in "${activeCategory}"`;
        emptyStateDesc.textContent = isAdmin()
          ? 'There are no products listed in this category yet. Add a product or select another category.'
          : `There are no products in "${activeCategory}" at the moment. Try selecting another category.`;
      }
      return;
    }

    emptyState.style.display = 'none';
    productGrid.innerHTML = '';

    filteredProducts.forEach((product) => {
      const card = createProductCard(product);
      productGrid.appendChild(card);
    });
  }

  /**
   * Generates a single product card DOM element.
   * In visitor mode, Edit and Delete controls are completely excluded from the DOM.
   */
  function createProductCard(product) {
    const card = document.createElement('article');
    const adminMode = isAdmin();
    card.className = `product-card ${adminMode ? 'is-admin' : ''}`;
    card.dataset.id = product.id;

    const formattedPrice = formatPrice(product.price);

    let footerHtml = '';
    if (adminMode) {
      footerHtml = `
        <div class="card-footer">
          <button type="button" class="btn btn-secondary btn-sm btn-edit" data-id="${product.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit
          </button>
          <button type="button" class="btn btn-outline-danger btn-sm btn-delete" data-id="${product.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete
          </button>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="card-image-wrap">
        <img class="card-image" src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy">
        <span class="card-category-badge">${escapeHtml(product.category)}</span>
      </div>
      <div class="card-body">
        <div class="card-header">
          <h3 class="card-title" title="${escapeHtml(product.name)}">${escapeHtml(product.name)}</h3>
          <span class="card-price">${formattedPrice}</span>
        </div>
        <p class="card-description" title="${escapeHtml(product.description)}">${escapeHtml(product.description)}</p>
        ${footerHtml}
      </div>
    `;

    // Hook card action listeners only if in admin mode
    if (adminMode) {
      const editBtn = card.querySelector('.btn-edit');
      const deleteBtn = card.querySelector('.btn-delete');

      if (editBtn) editBtn.addEventListener('click', () => openEditProductModal(product.id));
      if (deleteBtn) deleteBtn.addEventListener('click', () => handleDeleteProduct(product.id));
    }

    return card;
  }

  /**
   * Renders the category list in the Manage Categories modal.
   */
  function renderCategoriesModalList() {
    categoriesList.innerHTML = '';

    categories.forEach((cat) => {
      const count = products.filter((p) => p.category === cat).length;
      const item = document.createElement('div');
      item.className = 'category-manage-item';
      item.innerHTML = `
        <div class="category-manage-info">
          <span>${escapeHtml(cat)}</span>
          <span class="category-manage-count">${count} ${count === 1 ? 'item' : 'items'}</span>
        </div>
        <button type="button" class="btn-delete-cat" title="Delete category" aria-label="Delete category ${escapeHtml(cat)}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      `;

      const deleteBtn = item.querySelector('.btn-delete-cat');
      deleteBtn.addEventListener('click', () => handleDeleteCategory(cat));

      categoriesList.appendChild(item);
    });
  }

  /**
   * Updates options in the product modal category dropdown.
   */
  function populateProductCategoryDropdown(selectedVal = '') {
    productCategorySelect.innerHTML = '';

    if (categories.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No categories available';
      productCategorySelect.appendChild(opt);
      return;
    }

    categories.forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      if (cat === selectedVal) {
        opt.selected = true;
      }
      productCategorySelect.appendChild(opt);
    });
  }

  // ==========================================================================
  // Product Add / Edit / Delete Handlers
  // ==========================================================================

  function openAddProductModal() {
    if (!isAdmin()) {
      showToast('Admin access required to add products.', 'error');
      return;
    }

    clearProductErrors();
    productForm.reset();
    productIdInput.value = '';
    pendingImageBase64 = null;
    imageRequiredBadge.style.display = 'inline';

    productModalTitle.textContent = 'Add New Product';
    populateProductCategoryDropdown(activeCategory !== 'All' ? activeCategory : categories[0] || '');

    // Reset dropzone preview
    dropzoneEmpty.style.display = 'flex';
    dropzonePreview.style.display = 'none';
    imagePreviewImg.src = '';

    openModal(productModal);
    productNameInput.focus();
  }

  function openEditProductModal(productId) {
    if (!isAdmin()) {
      showToast('Admin access required to edit products.', 'error');
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (!product) return;

    clearProductErrors();
    productForm.reset();

    productIdInput.value = product.id;
    productNameInput.value = product.name;
    productPriceInput.value = product.price;
    productDescriptionInput.value = product.description;
    pendingImageBase64 = product.image; // Retain existing image unless replaced
    imageRequiredBadge.style.display = 'none'; // Optional to replace on edit

    productModalTitle.textContent = 'Edit Product';
    populateProductCategoryDropdown(product.category);

    // Show preview of current image
    dropzoneEmpty.style.display = 'none';
    dropzonePreview.style.display = 'block';
    imagePreviewImg.src = product.image;

    openModal(productModal);
    productNameInput.focus();
  }

  function handleProductFormSubmit(e) {
    e.preventDefault();
    if (!isAdmin()) {
      showToast('Admin access required to save products.', 'error');
      return;
    }

    clearProductErrors();

    const id = productIdInput.value.trim();
    const isEdit = Boolean(id);
    const name = productNameInput.value.trim();
    const price = parseFloat(productPriceInput.value);
    const category = productCategorySelect.value;
    const description = productDescriptionInput.value.trim();

    let hasError = false;

    if (!name) {
      nameError.textContent = 'Please enter a product name.';
      hasError = true;
    }

    if (isNaN(price) || price <= 0) {
      priceError.textContent = 'Please enter a valid price greater than Rs. 0.';
      hasError = true;
    }

    if (!category) {
      categoryError.textContent = 'Please choose a category.';
      hasError = true;
    }

    if (!description) {
      descriptionError.textContent = 'Please provide a short description.';
      hasError = true;
    }

    if (!pendingImageBase64) {
      imageError.textContent = 'Please upload an image for this product.';
      hasError = true;
    }

    if (hasError) return;

    if (isEdit) {
      // Update existing
      const index = products.findIndex((p) => p.id === id);
      if (index !== -1) {
        products[index] = {
          ...products[index],
          name,
          price,
          category,
          description,
          image: pendingImageBase64
        };
      }
    } else {
      // Create new
      const newProduct = {
        id: 'prod_' + Date.now(),
        name,
        price,
        category,
        description,
        image: pendingImageBase64
      };
      products.unshift(newProduct);
    }

    // Persist to localStorage
    const saved = safeSetStorage(STORAGE_KEYS.PRODUCTS, products);
    if (!saved) {
      // If saving failed (e.g. storage quota exceeded), revert memory change
      if (!isEdit) {
        products.shift();
      }
      return;
    }

    closeModal(productModal);
    renderCategoriesBar();
    renderProductsGrid();
    showToast(isEdit ? 'Product updated successfully.' : 'Product added successfully.', 'success');
  }

  function handleDeleteProduct(productId) {
    if (!isAdmin()) {
      showToast('Admin access required to delete products.', 'error');
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const confirmed = window.confirm(`Are you sure you want to delete "${product.name}"?`);
    if (!confirmed) return;

    products = products.filter((p) => p.id !== productId);
    safeSetStorage(STORAGE_KEYS.PRODUCTS, products);

    renderCategoriesBar();
    renderProductsGrid();
    showToast('Product deleted.', 'success');
  }

  // ==========================================================================
  // Category Management Handlers
  // ==========================================================================

  function openCategoryModalHandler() {
    if (!isAdmin()) {
      showToast('Admin access required to manage categories.', 'error');
      return;
    }

    newCategoryNameInput.value = '';
    newCategoryError.textContent = '';
    renderCategoriesModalList();
    openModal(categoryModal);
    newCategoryNameInput.focus();
  }

  function handleAddCategory(e) {
    e.preventDefault();
    if (!isAdmin()) {
      showToast('Admin access required to add categories.', 'error');
      return;
    }

    newCategoryError.textContent = '';
    const newName = newCategoryNameInput.value.trim();

    if (!newName) {
      newCategoryError.textContent = 'Please enter a category name.';
      return;
    }

    if (newName.toLowerCase() === 'all') {
      newCategoryError.textContent = '"All" is a reserved category name.';
      return;
    }

    const exists = categories.some((c) => c.toLowerCase() === newName.toLowerCase());
    if (exists) {
      newCategoryError.textContent = 'This category already exists.';
      return;
    }

    categories.push(newName);
    const saved = safeSetStorage(STORAGE_KEYS.CATEGORIES, categories);
    if (!saved) return;

    newCategoryNameInput.value = '';
    renderCategoriesModalList();
    renderCategoriesBar();
    showToast(`Category "${newName}" added.`, 'success');
  }

  function handleDeleteCategory(catName) {
    if (!isAdmin()) {
      showToast('Admin access required to delete categories.', 'error');
      return;
    }

    if (categories.length <= 1) {
      alert('You must have at least one category.');
      return;
    }

    const itemsInCategory = products.filter((p) => p.category === catName).length;
    let message = `Are you sure you want to delete category "${catName}"?`;
    if (itemsInCategory > 0) {
      message += `\n${itemsInCategory} ${itemsInCategory === 1 ? 'product' : 'products'} currently in this category will be moved to "${categories.find(c => c !== catName) || 'Uncategorized'}".`;
    }

    const confirmed = window.confirm(message);
    if (!confirmed) return;

    // Remove from category list
    categories = categories.filter((c) => c !== catName);
    safeSetStorage(STORAGE_KEYS.CATEGORIES, categories);

    // Reassign any products in that category
    if (itemsInCategory > 0) {
      const fallbackCat = categories[0] || 'Uncategorized';
      products.forEach((p) => {
        if (p.category === catName) {
          p.category = fallbackCat;
        }
      });
      safeSetStorage(STORAGE_KEYS.PRODUCTS, products);
    }

    // Reset active category filter if user was viewing the deleted category
    if (activeCategory === catName) {
      activeCategory = 'All';
    }

    renderCategoriesModalList();
    renderCategoriesBar();
    renderProductsGrid();
    showToast(`Category "${catName}" removed.`, 'success');
  }

  // ==========================================================================
  // Image Upload & Dropzone Handling
  // ==========================================================================

  function handleImageFileSelected(file) {
    if (!file) return;
    imageError.textContent = '';

    compressImageFile(file, 600, 0.7)
      .then((base64Url) => {
        pendingImageBase64 = base64Url;
        imagePreviewImg.src = base64Url;
        dropzoneEmpty.style.display = 'none';
        dropzonePreview.style.display = 'block';
      })
      .catch((err) => {
        imageError.textContent = err.message || 'Error processing image.';
      });
  }

  imageDropzone.addEventListener('click', () => {
    productImageInput.click();
  });

  imageDropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      productImageInput.click();
    }
  });

  productImageInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFileSelected(e.target.files[0]);
    }
  });

  // Drag and drop events
  ['dragenter', 'dragover'].forEach((eventName) => {
    imageDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      imageDropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    imageDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      imageDropzone.classList.remove('dragover');
    });
  });

  imageDropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFileSelected(e.dataTransfer.files[0]);
    }
  });

  // ==========================================================================
  // Modal Utilities
  // ==========================================================================

  function openModal(modalEl) {
    modalEl.classList.add('open');
    modalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modalEl) {
    modalEl.classList.remove('open');
    modalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // ==========================================================================
  // Admin Authentication & UI Handlers
  // ==========================================================================

  function updateAdminUI() {
    const loggedIn = isAdmin();
    if (loggedIn) {
      btnAdminLogin.style.display = 'none';
      btnAdminLogout.style.display = 'inline-flex';
      adminBadge.style.display = 'inline-flex';
      btnOpenManageCategories.style.display = 'inline-flex';
      btnOpenAddProduct.style.display = 'inline-flex';
      if (btnExportData) btnExportData.style.display = 'inline-flex';
      if (btnImportData) btnImportData.style.display = 'inline-flex';
    } else {
      btnAdminLogin.style.display = 'inline-flex';
      btnAdminLogout.style.display = 'none';
      adminBadge.style.display = 'none';
      btnOpenManageCategories.style.display = 'none';
      btnOpenAddProduct.style.display = 'none';
      if (btnExportData) btnExportData.style.display = 'none';
      if (btnImportData) btnImportData.style.display = 'none';
    }
    btnEmptyAddProduct.style.display = loggedIn ? 'inline-block' : 'none';
  }

  function openLoginModal() {
    loginForm.reset();
    loginError.textContent = '';
    openModal(loginModal);
    adminUsernameInput.focus();
  }

  function handleLoginSubmit(e) {
    e.preventDefault();
    loginError.textContent = '';

    const username = adminUsernameInput.value.trim();
    const password = adminPasswordInput.value;

    if (username === 'admin123' && password === 'Admin123') {
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
      adminUsernameInput.value = '';
      adminPasswordInput.value = '';
      closeModal(loginModal);
      updateAdminUI();
      renderProductsGrid();
      showToast('Admin logged in successfully.', 'success');
    } else {
      loginError.textContent = 'Invalid username or password';
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
    closeModal(productModal);
    closeModal(categoryModal);
    closeModal(loginModal);
    updateAdminUI();
    renderProductsGrid();
    showToast('Logged out to visitor mode.', 'success');
  }

  // Backdrop clicks
  [productModal, categoryModal, loginModal].forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (productModal.classList.contains('open')) closeModal(productModal);
      if (categoryModal.classList.contains('open')) closeModal(categoryModal);
      if (loginModal.classList.contains('open')) closeModal(loginModal);
    }
  });

  function clearProductErrors() {
    nameError.textContent = '';
    priceError.textContent = '';
    categoryError.textContent = '';
    descriptionError.textContent = '';
    imageError.textContent = '';
  }

  // ==========================================================================
  // Export & Import Handlers (Admin Only)
  // ==========================================================================

  /**
   * Exports products and categories to storefront-backup.json.
   * Refuses to run if user is not admin.
   */
  function handleExportData() {
    if (!isAdmin()) {
      showToast('Admin access required to export data.', 'error');
      return;
    }

    try {
      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        categories: Array.isArray(categories) ? [...categories] : [],
        products: Array.isArray(products) ? [...products] : []
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(blob);

      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = 'storefront-backup.json';
      document.body.appendChild(downloadLink);
      downloadLink.click();

      setTimeout(() => {
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadUrl);
      }, 100);

      showToast('Storefront data exported successfully.', 'success');
    } catch (err) {
      showToast('Failed to export data: ' + (err.message || 'Unknown error'), 'error');
    }
  }

  /**
   * Opens the file picker to import a JSON backup.
   * Refuses to run if user is not admin.
   */
  function handleImportClick() {
    if (!isAdmin()) {
      showToast('Admin access required to import data.', 'error');
      return;
    }

    if (importFileInput) {
      importFileInput.value = '';
      importFileInput.click();
    }
  }

  /**
   * Handles file selection for import.
   */
  function handleImportFileChange(e) {
    if (!isAdmin()) {
      showToast('Admin access required to import data.', 'error');
      if (importFileInput) importFileInput.value = '';
      return;
    }

    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => {
      showToast('Failed to read the selected file.', 'error');
      if (importFileInput) importFileInput.value = '';
    };

    reader.onload = (event) => {
      if (importFileInput) importFileInput.value = '';
      const content = event.target.result;
      processImportData(content);
    };

    reader.readAsText(file);
  }

  /**
   * Validates and imports JSON data, replacing current products and categories.
   * Catches localStorage quota errors and keeps old data intact on failure.
   */
  function processImportData(rawContent) {
    if (!isAdmin()) {
      showToast('Admin access required to import data.', 'error');
      return;
    }

    // 1. Must be valid JSON
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (e) {
      showToast('Invalid file: not valid JSON format.', 'error');
      return;
    }

    // 2. Must contain a products array and a categories array
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.products) || !Array.isArray(parsed.categories)) {
      showToast('Invalid backup format: file must contain "products" and "categories" arrays.', 'error');
      return;
    }

    // 3. Each product must have at least name, price and category
    for (let i = 0; i < parsed.products.length; i++) {
      const p = parsed.products[i];
      if (!p || typeof p !== 'object') {
        showToast(`Invalid product at index ${i + 1}.`, 'error');
        return;
      }

      if (typeof p.name !== 'string' || !p.name.trim()) {
        showToast(`Product at index ${i + 1} is missing a name.`, 'error');
        return;
      }

      const priceNum = typeof p.price === 'string' ? parseFloat(p.price) : Number(p.price);
      if (p.price === undefined || p.price === null || isNaN(priceNum) || priceNum <= 0) {
        showToast(`Product "${p.name.trim()}" is missing a valid price.`, 'error');
        return;
      }

      if (typeof p.category !== 'string' || !p.category.trim()) {
        showToast(`Product "${p.name.trim()}" is missing a category.`, 'error');
        return;
      }
    }

    // 4. Confirm with admin before replacing
    const confirmed = window.confirm('This will replace all current products and categories. Continue?');
    if (!confirmed) {
      return;
    }

    // 5. Sanitize and prepare data
    const sanitizedCategories = Array.from(
      new Set(
        parsed.categories
          .filter((cat) => typeof cat === 'string' && cat.trim())
          .map((cat) => cat.trim())
      )
    );

    const sanitizedProducts = parsed.products.map((p, index) => {
      const name = p.name.trim();
      const category = p.category.trim();
      const price = typeof p.price === 'string' ? parseFloat(p.price) : Number(p.price);
      const description = typeof p.description === 'string' ? p.description : '';
      const image = (typeof p.image === 'string' && p.image.trim())
        ? p.image
        : generatePlaceholderImage(name, category, '#1e3a8a', '#3b82f6', '✦');
      const id = p.id ? String(p.id) : ('prod_' + Date.now() + '_' + index);

      if (!sanitizedCategories.includes(category)) {
        sanitizedCategories.push(category);
      }

      return {
        id,
        name,
        category,
        price,
        description,
        image
      };
    });

    if (sanitizedCategories.length === 0) {
      if (sanitizedProducts.length > 0) {
        sanitizedProducts.forEach((p) => {
          if (!sanitizedCategories.includes(p.category)) {
            sanitizedCategories.push(p.category);
          }
        });
      } else {
        sanitizedCategories.push(...DEFAULT_CATEGORIES);
      }
    }

    // 6. Atomic write to localStorage (keep old data intact if storage fails)
    const oldProductsJson = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const oldCategoriesJson = localStorage.getItem(STORAGE_KEYS.CATEGORIES);

    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(sanitizedCategories));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(sanitizedProducts));
    } catch (err) {
      // Rollback to previous state
      try {
        if (oldCategoriesJson !== null) {
          localStorage.setItem(STORAGE_KEYS.CATEGORIES, oldCategoriesJson);
        } else {
          localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
        }
      } catch (_) {}

      try {
        if (oldProductsJson !== null) {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, oldProductsJson);
        } else {
          localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
        }
      } catch (_) {}

      const isQuota = (
        err.name === 'QuotaExceededError' ||
        err.code === 22 ||
        err.code === 1014 ||
        err.number === -2147024882
      );

      if (isQuota) {
        showToast('Storage limit reached! Import cancelled and existing data preserved.', 'error');
      } else {
        showToast('Failed to save imported data: ' + (err.message || 'Unknown error'), 'error');
      }
      return;
    }

    // 7. Update in-memory state and re-render without manual refresh
    categories = sanitizedCategories;
    products = sanitizedProducts;
    activeCategory = 'All';

    renderCategoriesBar();
    renderProductsGrid();
    showToast('Products and categories imported successfully.', 'success');
  }

  // ==========================================================================
  // Toast Notifications
  // ==========================================================================

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-leave');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 200);
    }, 3200);
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================================================
  // Event Bindings & Init
  // ==========================================================================

  btnAdminLogin.addEventListener('click', openLoginModal);
  btnAdminLogout.addEventListener('click', handleLogout);
  btnCloseLoginModal.addEventListener('click', () => closeModal(loginModal));
  btnCancelLogin.addEventListener('click', () => closeModal(loginModal));
  loginForm.addEventListener('submit', handleLoginSubmit);

  btnOpenAddProduct.addEventListener('click', openAddProductModal);
  btnEmptyAddProduct.addEventListener('click', openAddProductModal);
  btnCloseProductModal.addEventListener('click', () => closeModal(productModal));
  btnCancelProduct.addEventListener('click', () => closeModal(productModal));
  productForm.addEventListener('submit', handleProductFormSubmit);

  btnOpenManageCategories.addEventListener('click', openCategoryModalHandler);
  btnCloseCategoryModal.addEventListener('click', () => closeModal(categoryModal));
  btnCloseCategoryModalFooter.addEventListener('click', () => closeModal(categoryModal));
  addCategoryForm.addEventListener('submit', handleAddCategory);

  if (btnExportData) btnExportData.addEventListener('click', handleExportData);
  if (btnImportData) btnImportData.addEventListener('click', handleImportClick);
  if (importFileInput) importFileInput.addEventListener('change', handleImportFileChange);

  // Initialize
  initializeData();
  updateAdminUI();
  renderCategoriesBar();
  renderProductsGrid();
})();
