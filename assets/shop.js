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
const checkoutWilaya = document.querySelector("#checkoutWilaya");
const deliveryType = document.querySelector("#deliveryType");

const homeDeliveryFields = document.querySelector(
  "#homeDeliveryFields"
);

const checkoutCommune = document.querySelector(
  "#checkoutCommune"
);

const checkoutAddress = document.querySelector(
  "#checkoutAddress"
);

const checkoutSubtotal = document.querySelector(
  "#checkoutSubtotal"
);

const checkoutDeliveryPrice = document.querySelector(
  "#checkoutDeliveryPrice"
);

const checkoutFinalTotal = document.querySelector(
  "#checkoutFinalTotal"
);
const productDialog = document.querySelector("#productDialog");
const closeProductDialog = document.querySelector("#closeProductDialog");
const productDialogContent = document.querySelector("#productDialogContent");

let products = [];
let cart = JSON.parse(localStorage.getItem("shop_cart") || "[]");
const DELIVERY_RATES = [
  { code: 1,  name: "Adrar",                 bureau: 1100, domicile: 1400 },
  { code: 2,  name: "Chlef",                 bureau: 450,  domicile: 850 },
  { code: 3,  name: "Laghouat",              bureau: 700,  domicile: 1000 },
  { code: 4,  name: "Oum El Bouaghi",        bureau: 500,  domicile: 850 },
  { code: 5,  name: "Batna",                 bureau: 500,  domicile: 850 },
  { code: 6,  name: "Béjaïa",                bureau: 500,  domicile: 850 },
  { code: 7,  name: "Biskra",                bureau: 600,  domicile: 950 },
  { code: 8,  name: "Béchar",                bureau: 1100, domicile: 1400 },
  { code: 9,  name: "Blida",                 bureau: 450,  domicile: 700 },
  { code: 10, name: "Bouira",                bureau: 450,  domicile: 850 },
  { code: 11, name: "Tamanrasset",           bureau: 1400, domicile: 1800 },
  { code: 12, name: "Tébessa",               bureau: 600,  domicile: 950 },
  { code: 13, name: "Tlemcen",               bureau: 500,  domicile: 850 },
  { code: 14, name: "Tiaret",                bureau: 500,  domicile: 850 },
  { code: 15, name: "Tizi Ouzou",            bureau: 450,  domicile: 850 },
  { code: 16, name: "Alger",                 bureau: 400,  domicile: 500 },
  { code: 17, name: "Djelfa",                bureau: 600,  domicile: 900 },
  { code: 18, name: "Jijel",                 bureau: 500,  domicile: 850 },
  { code: 19, name: "Sétif",                 bureau: 450,  domicile: 850 },
  { code: 20, name: "Saïda",                 bureau: 600,  domicile: 900 },
  { code: 21, name: "Skikda",                bureau: 500,  domicile: 850 },
  { code: 22, name: "Sidi Bel Abbès",        bureau: 500,  domicile: 850 },
  { code: 23, name: "Annaba",                bureau: 500,  domicile: 850 },
  { code: 24, name: "Guelma",                bureau: 600,  domicile: 900 },
  { code: 25, name: "Constantine",           bureau: 450,  domicile: 850 },
  { code: 26, name: "Médéa",                 bureau: 450,  domicile: 850 },
  { code: 27, name: "Mostaganem",            bureau: 500,  domicile: 850 },
  { code: 28, name: "M'Sila",                bureau: 500,  domicile: 850 },
  { code: 29, name: "Mascara",               bureau: 600,  domicile: 900 },
  { code: 30, name: "Ouargla",               bureau: 700,  domicile: 1100 },
  { code: 31, name: "Oran",                  bureau: 450,  domicile: 850 },
  { code: 32, name: "El Bayadh",             bureau: 800,  domicile: 1100 },
  { code: 33, name: "Illizi",                bureau: 1700, domicile: 2000 },
  { code: 34, name: "Bordj Bou Arreridj",    bureau: 450,  domicile: 850 },
  { code: 35, name: "Boumerdès",             bureau: 450,  domicile: 700 },
  { code: 36, name: "El Tarf",               bureau: 600,  domicile: 950 },
  { code: 37, name: "Tindouf",               bureau: 1400, domicile: 1800 },
  { code: 38, name: "Tissemsilt",            bureau: 500,  domicile: 850 },
  { code: 39, name: "El Oued",               bureau: 800,  domicile: 1100 },
  { code: 40, name: "Khenchela",             bureau: 600,  domicile: 900 },
  { code: 41, name: "Souk Ahras",            bureau: 600,  domicile: 900 },
  { code: 42, name: "Tipaza",                bureau: 450,  domicile: 700 },
  { code: 43, name: "Mila",                  bureau: 500,  domicile: 850 },
  { code: 44, name: "Aïn Defla",             bureau: 450,  domicile: 850 },
  { code: 45, name: "Naâma",                 bureau: 800,  domicile: 1100 },
  { code: 46, name: "Aïn Témouchent",        bureau: 600,  domicile: 900 },
  { code: 47, name: "Ghardaïa",              bureau: 800,  domicile: 1100 },
  { code: 48, name: "Relizane",              bureau: 500,  domicile: 850 },
  { code: 49, name: "Timimoun",              bureau: 1100, domicile: 1400 },
  { code: 50, name: "Bordj Badji Mokhtar",   bureau: 1700, domicile: 2000 },
  { code: 51, name: "Ouled Djellal",         bureau: 700,  domicile: 1000 },
  { code: 52, name: "Béni Abbès",            bureau: 1100, domicile: 1400 },
  { code: 53, name: "In Salah",              bureau: 1100, domicile: 1400 },
  { code: 54, name: "In Guezzam",            bureau: 1700, domicile: 2000 },
  { code: 55, name: "Touggourt",             bureau: 800,  domicile: 1100 },
  { code: 56, name: "Djanet",                bureau: 1700, domicile: 2000 },
  { code: 57, name: "El M'Ghair",            bureau: 800,  domicile: 1100 },
  { code: 58, name: "El Meniaa",             bureau: 1000, domicile: 1300 }
];
let COMMUNES_DATA = [];

const formatPrice = value =>
  new Intl.NumberFormat("fr-DZ").format(Number(value || 0)) + " DA";

function populateWilayas() {
  checkoutWilaya.innerHTML = `
    <option value="">Choisir votre wilaya</option>

    ${DELIVERY_RATES.map(wilaya => `
      <option value="${wilaya.code}">
        ${wilaya.code.toString().padStart(2, "0")} — ${wilaya.name}
      </option>
    `).join("")}
  `;
}
async function loadCommunesData() {
  try {
    const response = await fetch(
      "assets/algeria_cities.json"
    );

    if (!response.ok) {
      throw new Error(
        "Impossible de charger les communes."
      );
    }

    COMMUNES_DATA = await response.json();

    populateCommunes();
  } catch (error) {
    console.error(
      "Erreur de chargement des communes :",
      error
    );

    checkoutCommune.innerHTML = `
      <option value="">
        Communes indisponibles
      </option>
    `;

    checkoutCommune.disabled = true;
  }
}

function populateCommunes() {
  const wilayaCode = String(
    checkoutWilaya.value
  ).padStart(2, "0");

  if (!checkoutWilaya.value) {
    checkoutCommune.innerHTML = `
      <option value="">
        Choisissez d’abord une wilaya
      </option>
    `;

    checkoutCommune.disabled = true;
    return;
  }

  const wilayaCommunes = COMMUNES_DATA
    .filter(commune =>
      commune.wilaya_code === wilayaCode
    )
    .sort((firstCommune, secondCommune) =>
      firstCommune.commune_name_ascii.localeCompare(
        secondCommune.commune_name_ascii,
        "fr"
      )
    );

  checkoutCommune.innerHTML = `
    <option value="">
      Choisir votre commune
    </option>

    ${wilayaCommunes.map(commune => `
      <option value="${escapeHtml(
        commune.commune_name_ascii
      )}">
        ${escapeHtml(
          commune.commune_name_ascii
        )}
      </option>
    `).join("")}
  `;

  checkoutCommune.disabled =
    wilayaCommunes.length === 0;
}

function getProductsSubtotal() {
  return cart.reduce(
    (total, item) =>
      total + Number(item.price) * Number(item.quantity),
    0
  );
}

function getSelectedWilaya() {
  const wilayaCode = Number(checkoutWilaya.value);

  return DELIVERY_RATES.find(
    wilaya => wilaya.code === wilayaCode
  );
}

function getDeliveryPrice() {
  const selectedWilaya = getSelectedWilaya();
  const selectedType = deliveryType.value;

  if (!selectedWilaya || !selectedType) {
    return 0;
  }

  return Number(
    selectedWilaya[selectedType] || 0
  );
}

function updateCheckoutSummary() {
  const subtotal = getProductsSubtotal();
  const deliveryPrice = getDeliveryPrice();

  const deliveryIsSelected =
    Boolean(checkoutWilaya.value) &&
    Boolean(deliveryType.value);

  checkoutSubtotal.textContent =
    formatPrice(subtotal);

  checkoutDeliveryPrice.textContent =
    deliveryIsSelected
      ? formatPrice(deliveryPrice)
      : "—";

  checkoutFinalTotal.textContent =
    formatPrice(subtotal + deliveryPrice);
}

function updateDeliveryFields() {
  const isHomeDelivery =
    deliveryType.value === "domicile";

  homeDeliveryFields.classList.toggle(
    "hidden",
    !isHomeDelivery
  );

  checkoutCommune.required = isHomeDelivery;
  checkoutAddress.required = isHomeDelivery;

  if (!isHomeDelivery) {
    checkoutCommune.value = "";
    checkoutAddress.value = "";
  }

  updateCheckoutSummary();
}

checkoutWilaya.addEventListener(
  "change",
  () => {
    populateCommunes();
    updateCheckoutSummary();
  }
);

deliveryType.addEventListener(
  "change",
  updateDeliveryFields
);

populateWilayas();
loadCommunesData();
updateDeliveryFields();

const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const getProductImages = product => {
  const images = Array.isArray(product?.images)
    ? product.images.filter(Boolean)
    : [];

  if (images.length) {
    return [...new Set(images)];
  }

  return product?.imageUrl
    ? [product.imageUrl]
    : [];
};

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
  const images = getProductImages(product);
  const galleryImages = images.length
    ? images
    : ["https://placehold.co/800x900?text=Produit"];

  productDialogContent.innerHTML = `
    <div class="product-detail">

      <div class="product-gallery">

        <div class="product-main-image-wrap">

          <img
            id="productMainImage"
            src="${escapeHtml(galleryImages[0])}"
            alt="${escapeHtml(product.name)}"
          />

          ${galleryImages.length > 1 ? `
            <button
              class="gallery-arrow gallery-previous"
              type="button"
              aria-label="Photo précédente"
            >
              ‹
            </button>

            <button
              class="gallery-arrow gallery-next"
              type="button"
              aria-label="Photo suivante"
            >
              ›
            </button>

            <span class="gallery-counter" id="galleryCounter">
              1 / ${galleryImages.length}
            </span>
          ` : ""}

        </div>

        ${galleryImages.length > 1 ? `
          <div class="product-thumbnails">

            ${galleryImages.map((image, index) => `
              <button
                class="product-thumbnail ${
                  index === 0 ? "active" : ""
                }"
                type="button"
                data-gallery-index="${index}"
                aria-label="Afficher la photo ${index + 1}"
              >
                <img
                  src="${escapeHtml(image)}"
                  alt=""
                />
              </button>
            `).join("")}

          </div>
        ` : ""}

      </div>

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
  let activeImageIndex = 0;

  const mainImage = productDialogContent.querySelector(
    "#productMainImage"
  );

  const galleryCounter = productDialogContent.querySelector(
    "#galleryCounter"
  );

  const thumbnails = [
    ...productDialogContent.querySelectorAll(
      ".product-thumbnail"
    )
  ];

  const mainImageWrap = productDialogContent.querySelector(
    ".product-main-image-wrap"
  );

  function showGalleryImage(index) {
    activeImageIndex =
      (index + galleryImages.length) %
      galleryImages.length;

    mainImage.src = galleryImages[activeImageIndex];

    thumbnails.forEach((thumbnail, thumbnailIndex) => {
      thumbnail.classList.toggle(
        "active",
        thumbnailIndex === activeImageIndex
      );
    });

    if (galleryCounter) {
      galleryCounter.textContent =
        `${activeImageIndex + 1} / ${galleryImages.length}`;
    }
  }

  /* Clic sur une miniature */

  thumbnails.forEach(thumbnail => {
    thumbnail.addEventListener("click", () => {
      showGalleryImage(
        Number(thumbnail.dataset.galleryIndex)
      );
    });
  });

  /* Flèche précédente */

  productDialogContent
    .querySelector(".gallery-previous")
    ?.addEventListener("click", () => {
      showGalleryImage(activeImageIndex - 1);
    });

  /* Flèche suivante */

  productDialogContent
    .querySelector(".gallery-next")
    ?.addEventListener("click", () => {
      showGalleryImage(activeImageIndex + 1);
    });

  /* Balayage sur téléphone */

  let touchStartX = 0;

  mainImageWrap.addEventListener(
    "touchstart",
    event => {
      touchStartX =
        event.changedTouches[0].clientX;
    },
    { passive: true }
  );

  mainImageWrap.addEventListener(
    "touchend",
    event => {
      const distance =
        event.changedTouches[0].clientX -
        touchStartX;

      if (
        Math.abs(distance) < 45 ||
        galleryImages.length < 2
      ) {
        return;
      }

      showGalleryImage(
        activeImageIndex +
        (distance < 0 ? 1 : -1)
      );
    },
    { passive: true }
  );
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

const selectedWilaya = getSelectedWilaya();
const selectedDeliveryType = deliveryType.value;

if (!selectedWilaya || !selectedDeliveryType) {
  checkoutStatus.textContent =
    "Choisissez la wilaya et le type de livraison.";

  return;
}

const subtotal = getProductsSubtotal();
const deliveryPrice = getDeliveryPrice();
const finalTotal = subtotal + deliveryPrice;

const isHomeDelivery =
  selectedDeliveryType === "domicile";

const order = {
  customerName: formData.get("customerName"),
  phone: formData.get("phone"),

  wilayaCode: selectedWilaya.code,
  wilaya: selectedWilaya.name,

  deliveryType: selectedDeliveryType,

  deliveryLabel: isHomeDelivery
    ? "Livraison à domicile"
    : "Livraison au bureau (Stop Desk)",

  commune: isHomeDelivery
    ? formData.get("commune")
    : "",

  address: isHomeDelivery
    ? formData.get("address")
    : "",

  note: formData.get("note") || "",

  items: cart,

  subtotal: subtotal,
  deliveryPrice: deliveryPrice,
  total: finalTotal,

  status: "Nouvelle",
  createdAt: serverTimestamp()
};

  try {
    const docRef = await addDoc(collection(db, "orders"), order);
    checkoutStatus.textContent = `Commande enregistrée avec succès. Référence : ${docRef.id.slice(0, 8).toUpperCase()}`;
    cart = [];
    saveCart();
    checkoutForm.reset();
    updateDeliveryFields();
    updateCheckoutSummary();
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
  if (!cart.length) {
    return alert("Votre panier est vide.");
  }

  closeCartDrawer();

  updateCheckoutSummary();
  checkoutDialog.showModal();
});
closeCheckoutDialog.addEventListener("click", () => checkoutDialog.close());
closeProductDialog.addEventListener("click", () => productDialog.close());

renderCart();
loadProducts();
