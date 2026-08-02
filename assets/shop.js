import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const productGrid = document.querySelector("#productGrid");
const emptyProducts = document.querySelector("#emptyProducts");
const searchInput = document.querySelector("#searchInput");
const categoryFilter = document.querySelector("#categoryFilter");
const cartButton = document.querySelector("#cartButton");
const closeCart = document.querySelector("#closeCart");
const cartDrawer = document.querySelector("#cartDrawer");
const overlay = document.querySelector("#overlay");
const cartItems = document.querySelector("#cartItems");
const cartCount = document.querySelector("#cartCount");
const cartTotal = document.querySelector("#cartTotal");
const checkoutButton = document.querySelector("#checkoutButton");
const checkoutDialog = document.querySelector("#checkoutDialog");
const closeCheckoutDialog = document.querySelector("#closeCheckoutDialog");
const checkoutForm = document.querySelector("#checkoutForm");
const checkoutStatus = document.querySelector("#checkoutStatus");
const productDialog = document.querySelector("#productDialog");
const closeProductDialog = document.querySelector("#closeProductDialog");
const productDialogContent = document.querySelector("#productDialogContent");

let products = [];
let cart = JSON.parse(localStorage.getItem("shop_cart") || "[]");

const formatPrice = value =>
  new Intl.NumberFormat("fr-DZ").format(Number(value || 0)) + " DA";

const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

async function loadProducts() {
  try {
    const snapshot = await getDocs(collection(db, "products"));
    products = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(product => product.active !== false);
    buildCategories();
    renderProducts();
  } catch (error) {
    productGrid.innerHTML = `<p class="error">Impossible de charger les produits. Vérifiez Firebase.</p>`;
    console.error(error);
  }
}

function buildCategories() {
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  categoryFilter.innerHTML = `<option value="">Toutes les catégories</option>` +
    categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function renderProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;

  const filtered = products.filter(product => {
    const matchesSearch =
      product.name?.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query);
    return matchesSearch && (!category || product.category === category);
  });

  emptyProducts.classList.toggle("hidden", filtered.length > 0);
  productGrid.innerHTML = filtered.map(product => `
    <article class="product-card">
      <button class="product-image-button" data-product-id="${product.id}">
        <img src="${escapeHtml(product.imageUrl || "https://placehold.co/800x900?text=Produit")}"
             alt="${escapeHtml(product.name)}" loading="lazy" />
      </button>
      <div class="product-card-content">
        <span class="category">${escapeHtml(product.category || "Produit")}</span>
        <h3>${escapeHtml(product.name)}</h3>
        <div class="price-row">
          <strong>${formatPrice(product.price)}</strong>
          ${product.oldPrice ? `<del>${formatPrice(product.oldPrice)}</del>` : ""}
        </div>
        <button class="primary-button full view-product" data-product-id="${product.id}">
          Choisir les options
        </button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-product-id]").forEach(button => {
    button.addEventListener("click", () => openProduct(button.dataset.productId));
  });
}

function openProduct(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const colors = Array.isArray(product.colors) ? product.colors : [];

  productDialogContent.innerHTML = `
    <div class="product-detail">
      <img src="${escapeHtml(product.imageUrl || "https://placehold.co/800x900?text=Produit")}"
           alt="${escapeHtml(product.name)}" />
      <form id="addToCartForm">
        <span class="category">${escapeHtml(product.category || "Produit")}</span>
        <h2>${escapeHtml(product.name)}</h2>
        <div class="price-row">
          <strong>${formatPrice(product.price)}</strong>
          ${product.oldPrice ? `<del>${formatPrice(product.oldPrice)}</del>` : ""}
        </div>
        <p>${escapeHtml(product.description || "")}</p>
        ${sizes.length ? `
          <label>Taille
            <select name="size" required>
              <option value="">Choisir</option>
              ${sizes.map(v => `<option>${escapeHtml(v)}</option>`).join("")}
            </select>
          </label>` : ""}
        ${colors.length ? `
          <label>Couleur
            <select name="color" required>
              <option value="">Choisir</option>
              ${colors.map(v => `<option>${escapeHtml(v)}</option>`).join("")}
            </select>
          </label>` : ""}
        <label>Quantité
          <input name="quantity" type="number" min="1" max="${Number(product.stock || 99)}" value="1" required />
        </label>
        <button class="primary-button full" type="submit">Ajouter au panier</button>
      </form>
    </div>
  `;

  productDialog.showModal();
  document.querySelector("#addToCartForm").addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    addToCart(product, {
      size: data.get("size") || "",
      color: data.get("color") || "",
      quantity: Number(data.get("quantity"))
    });
    productDialog.close();
    openCart();
  });
}

function addToCart(product, options) {
  const key = `${product.id}-${options.size}-${options.color}`;
  const existing = cart.find(item => item.key === key);
  if (existing) existing.quantity += options.quantity;
  else cart.push({
    key,
    productId: product.id,
    name: product.name,
    price: Number(product.price),
    imageUrl: product.imageUrl || "",
    ...options
  });
  saveCart();
}

function saveCart() {
  localStorage.setItem("shop_cart", JSON.stringify(cart));
  renderCart();
}

function renderCart() {
  cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartTotal.textContent = formatPrice(
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  if (!cart.length) {
    cartItems.innerHTML = `<p class="empty">Votre panier est vide.</p>`;
    return;
  }

  cartItems.innerHTML = cart.map(item => `
    <article class="cart-item">
      <img src="${escapeHtml(item.imageUrl || "https://placehold.co/150")}" alt="" />
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml([item.size, item.color].filter(Boolean).join(" · "))}</small>
        <span>${item.quantity} × ${formatPrice(item.price)}</span>
      </div>
      <button class="remove-item" data-key="${escapeHtml(item.key)}">✕</button>
    </article>
  `).join("");

  document.querySelectorAll(".remove-item").forEach(button => {
    button.addEventListener("click", () => {
      cart = cart.filter(item => item.key !== button.dataset.key);
      saveCart();
    });
  });
}

function openCart() {
  cartDrawer.classList.add("open");
  overlay.classList.remove("hidden");
}

function closeCartDrawer() {
  cartDrawer.classList.remove("open");
  overlay.classList.add("hidden");
}

checkoutForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!cart.length) return;

  checkoutStatus.textContent = "Enregistrement de la commande...";
  const formData = new FormData(checkoutForm);
  const order = {
    customerName: formData.get("customerName"),
    phone: formData.get("phone"),
    wilaya: formData.get("wilaya"),
    commune: formData.get("commune"),
    address: formData.get("address"),
    note: formData.get("note") || "",
    items: cart,
    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    status: "Nouvelle",
    createdAt: serverTimestamp()
  };

  try {
    const docRef = await addDoc(collection(db, "orders"), order);
    checkoutStatus.textContent = `Commande enregistrée avec succès. Référence : ${docRef.id.slice(0, 8).toUpperCase()}`;
    cart = [];
    saveCart();
    checkoutForm.reset();
  } catch (error) {
    checkoutStatus.textContent = "Erreur lors de la commande. Réessayez.";
    console.error(error);
  }
});

searchInput.addEventListener("input", renderProducts);
categoryFilter.addEventListener("change", renderProducts);
cartButton.addEventListener("click", openCart);
closeCart.addEventListener("click", closeCartDrawer);
overlay.addEventListener("click", closeCartDrawer);
checkoutButton.addEventListener("click", () => {
  if (!cart.length) return alert("Votre panier est vide.");
  closeCartDrawer();
  checkoutDialog.showModal();
});
closeCheckoutDialog.addEventListener("click", () => checkoutDialog.close());
closeProductDialog.addEventListener("click", () => productDialog.close());

renderCart();
loadProducts();
