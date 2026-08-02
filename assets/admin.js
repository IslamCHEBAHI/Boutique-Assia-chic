import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { cloudinaryConfig } from "./cloudinary-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginSection = document.querySelector("#loginSection");
const adminDashboard = document.querySelector("#adminDashboard");
const loginForm = document.querySelector("#loginForm");
const loginStatus = document.querySelector("#loginStatus");
const logoutButton = document.querySelector("#logoutButton");
const productForm = document.querySelector("#productForm");
const productStatus = document.querySelector("#productStatus");
const productFormTitle = document.querySelector("#productFormTitle");
const cancelEditButton = document.querySelector("#cancelEditButton");
const adminProductsList = document.querySelector("#adminProductsList");
const ordersList = document.querySelector("#ordersList");
const refreshOrders = document.querySelector("#refreshOrders");
const productCategory = document.querySelector("#productCategory");
const sizesField = document.querySelector("#sizesField");
const colorsField = document.querySelector("#colorsField");
const productImagesInput = document.querySelector("#productImages");
const imagesPreview = document.querySelector("#imagesPreview");

function updateVariantFields(clearHiddenValues = true) {
  const category = productCategory.value;

  const showSizes = category === "vetement-femme";

  const showColors =
    category === "vetement-femme" ||
    category === "sac-femme";

  sizesField.classList.toggle("hidden", !showSizes);
  colorsField.classList.toggle("hidden", !showColors);

  if (clearHiddenValues) {
    if (!showSizes) {
      productForm.elements.sizes.value = "";
    }

    if (!showColors) {
      productForm.elements.colors.value = "";
    }
  }
}

productCategory.addEventListener("change", () => {
  updateVariantFields(true);
});

let products = [];
let editingImages = [];
let pendingImageFiles = [];
let primaryImageKey = "";
let pendingPreviewUrls = [];

const formatPrice = value =>
  new Intl.NumberFormat("fr-DZ").format(Number(value || 0)) + " DA";

const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const csvToArray = value =>
  value.split(",").map(v => v.trim()).filter(Boolean);

const getProductImages = product => {
  const images = Array.isArray(product?.images)
    ? product.images.filter(Boolean)
    : [];

  if (images.length) {
    return [...new Set(images)];
  }

  return product?.imageUrl ? [product.imageUrl] : [];
};

function clearPendingPreviewUrls() {
  pendingPreviewUrls.forEach(url => {
    URL.revokeObjectURL(url);
  });

  pendingPreviewUrls = [];
}

function ensurePrimaryImage() {
  const availableKeys = [
    ...editingImages.map(url => `url:${url}`),
    ...pendingImageFiles.map((file, index) => `new:${index}`)
  ];

  if (!availableKeys.includes(primaryImageKey)) {
    primaryImageKey = availableKeys[0] || "";
  }
}

function renderImagesPreview() {
  clearPendingPreviewUrls();
  ensurePrimaryImage();

  const existingCards = editingImages.map(url => ({
    key: `url:${url}`,
    src: url,
    name: "Photo enregistrée",
    isNew: false
  }));

  const newCards = pendingImageFiles.map((file, index) => {
    const src = URL.createObjectURL(file);

    pendingPreviewUrls.push(src);

    return {
      key: `new:${index}`,
      src,
      name: file.name,
      isNew: true
    };
  });

  const cards = [...existingCards, ...newCards];

  if (!cards.length) {
    imagesPreview.innerHTML = `
      <p class="images-preview-empty">
        Aucune photo sélectionnée.
      </p>
    `;

    return;
  }

  imagesPreview.innerHTML = cards.map(card => `
    <article class="image-preview-card ${
      card.key === primaryImageKey ? "is-primary" : ""
    }">

      <img
        src="${escapeHtml(card.src)}"
        alt="${escapeHtml(card.name)}"
      />

      ${
        card.isNew
          ? `<span class="new-image-badge">Nouvelle</span>`
          : ""
      }

      <div class="image-preview-actions">

        <button
          class="set-primary-image"
          type="button"
          data-image-key="${escapeHtml(card.key)}"
        >
          ${
            card.key === primaryImageKey
              ? "✓ Principale"
              : "Choisir comme principale"
          }
        </button>

        <button
          class="remove-preview-image"
          type="button"
          data-image-key="${escapeHtml(card.key)}"
          aria-label="Retirer cette photo"
        >
          ✕
        </button>

      </div>
    </article>
  `).join("");
}
productImagesInput.addEventListener("change", () => {
  const selectedFiles = Array.from(
    productImagesInput.files || []
  );

  if (editingImages.length + selectedFiles.length > 8) {
    productStatus.textContent =
      "Erreur : maximum 8 photos par produit.";

    productImagesInput.value = "";
    return;
  }

  pendingImageFiles = selectedFiles;
  productStatus.textContent = "";

  ensurePrimaryImage();
  renderImagesPreview();
});

imagesPreview.addEventListener("click", event => {
  const primaryButton = event.target.closest(
    ".set-primary-image"
  );

  const removeButton = event.target.closest(
    ".remove-preview-image"
  );

  /* Choisir la photo principale */

  if (primaryButton) {
    primaryImageKey = primaryButton.dataset.imageKey;
    renderImagesPreview();
    return;
  }

  /* Supprimer une photo */

  if (!removeButton) {
    return;
  }

  const key = removeButton.dataset.imageKey;

  if (key.startsWith("url:")) {
    const imageUrl = key.slice(4);

    editingImages = editingImages.filter(
      image => image !== imageUrl
    );
  }

  if (key.startsWith("new:")) {
    const imageIndex = Number(key.slice(4));

    pendingImageFiles.splice(imageIndex, 1);
    productImagesInput.value = "";
  }

  if (primaryImageKey === key) {
    primaryImageKey = "";
  }

  ensurePrimaryImage();
  renderImagesPreview();
});

  async function uploadImageToCloudinary(file) {
    const uploadData = new FormData();

    uploadData.append("file", file);
    uploadData.append("upload_preset", cloudinaryConfig.uploadPreset);
    uploadData.append("folder", "assia-chic/products");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
      {
        method: "POST",
        body: uploadData
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error?.message || "Impossible d’envoyer la photo vers Cloudinary."
      );
    }

    return result.secure_url;
  }

  async function uploadMultipleImages(files) {
    const selectedFiles = Array.from(files);

    if (selectedFiles.length > 8) {
      throw new Error("Vous pouvez ajouter au maximum 8 photos par produit.");
    }

    for (const file of selectedFiles) {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error(`La photo ${file.name} dépasse la limite de 5 Mo.`);
      }
    }

    return Promise.all(
      selectedFiles.map(file => uploadImageToCloudinary(file))
    );
  }

onAuthStateChanged(auth, user => {
  loginSection.classList.toggle("hidden", Boolean(user));
  adminDashboard.classList.toggle("hidden", !user);
  if (user) {
    loadProducts();
    loadOrders();
  }
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  loginStatus.textContent = "Connexion...";
  const data = new FormData(loginForm);
  try {
    await signInWithEmailAndPassword(auth, data.get("email"), data.get("password"));
    loginStatus.textContent = "";
    loginForm.reset();
  } catch (error) {
    loginStatus.textContent = "Email ou mot de passe incorrect.";
    console.error(error);
  }
});

logoutButton.addEventListener("click", () => signOut(auth));

productForm.addEventListener("submit", async event => {
  event.preventDefault();
  productStatus.textContent = "Enregistrement...";
  const data = new FormData(productForm);
  const productId = data.get("productId");
  try {
    let uploadedImages = [];

    if (pendingImageFiles.length > 0) {
      productStatus.textContent = "Envoi des photos...";

      uploadedImages = await uploadMultipleImages(
        pendingImageFiles
      );
    }

    /* Réunir les anciennes et les nouvelles photos */

    const allImages = [
      ...editingImages,
      ...uploadedImages
    ];

    if (allImages.length === 0) {
      throw new Error(
        "Sélectionnez au moins une photo du produit."
      );
    }

    /* Identifier la photo principale */

    let primaryImageUrl = "";

    if (primaryImageKey.startsWith("url:")) {
      primaryImageUrl = primaryImageKey.slice(4);
    }

    if (primaryImageKey.startsWith("new:")) {
      const newImageIndex = Number(
        primaryImageKey.slice(4)
      );

      primaryImageUrl =
        uploadedImages[newImageIndex] || "";
    }

    /* Sécurité : choisir la première si nécessaire */

    if (!allImages.includes(primaryImageUrl)) {
      primaryImageUrl = allImages[0];
    }

    /* Mettre la photo principale en première position */

    const imageUrls = [
      primaryImageUrl,
      ...allImages.filter(
        imageUrl => imageUrl !== primaryImageUrl
      )
    ];
    const payload = {
      name: data.get("name").trim(),
      category: data.get("category").trim(),
      price: Number(data.get("price")),
      oldPrice: data.get("oldPrice") ? Number(data.get("oldPrice")) : null,
      stock: Number(data.get("stock")),
      sizes: csvToArray(data.get("sizes")),
      colors: csvToArray(data.get("colors")),
      description: data.get("description").trim(),
      images: imageUrls,
      imageUrl: imageUrls[0],
      featured: data.get("featured") === "on",
      active: true,
      updatedAt: serverTimestamp()
    };
    if (productId) {
      await updateDoc(doc(db, "products", productId), payload);
      productStatus.textContent = "Produit modifié.";
    } else {
      payload.createdAt = serverTimestamp();
      await addDoc(collection(db, "products"), payload);
      productStatus.textContent = "Produit ajouté.";
    }

    resetProductForm();
    await loadProducts();
  } catch (error) {
    productStatus.textContent = `Erreur : ${error.message}`;
    console.error("Erreur lors de l’enregistrement :", error);
  }
});

async function loadProducts() {
  const snapshot = await getDocs(collection(db, "products"));
  products = snapshot.docs.map(document => ({ id: document.id, ...document.data() }));
  renderAdminProducts();
}

function renderAdminProducts() {
  if (!products.length) {
    adminProductsList.innerHTML = `<p class="empty">Aucun produit.</p>`;
    return;
  }

  adminProductsList.innerHTML = products.map(product => `
    <article class="admin-list-item">
      <img src="${escapeHtml(product.imageUrl || "https://placehold.co/120")}" alt="" />
      <div>
        <strong>${escapeHtml(product.name)}</strong>
        <span>${formatPrice(product.price)} · Stock : ${Number(product.stock || 0)}</span>
      </div>
      <div class="list-actions">
        <button class="secondary-button edit-product" data-id="${product.id}">Modifier</button>
        <button class="danger-button delete-product" data-id="${product.id}">Supprimer</button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".edit-product").forEach(button =>
    button.addEventListener("click", () => editProduct(button.dataset.id))
  );
  document.querySelectorAll(".delete-product").forEach(button =>
    button.addEventListener("click", () => removeProduct(button.dataset.id))
  );
}

function editProduct(id) {
  const product = products.find(item => item.id === id);
  if (!product) return;
  const f = productForm.elements;
  f.productId.value = product.id;
  f.name.value = product.name || "";
  f.category.value = product.category || "";
  f.price.value = product.price || 0;
  f.oldPrice.value = product.oldPrice || "";
  f.stock.value = product.stock || 0;
  f.sizes.value = (product.sizes || []).join(", ");
  f.colors.value = (product.colors || []).join(", ");
  f.description.value = product.description || "";
  f.featured.checked = Boolean(product.featured);
  /* Charger toutes les photos du produit */

  editingImages = getProductImages(product);
  pendingImageFiles = [];

  productImagesInput.value = "";

  primaryImageKey = editingImages[0]
    ? `url:${editingImages[0]}`
    : "";

  /* Afficher correctement tailles et couleurs */

  updateVariantFields(false);

  /* Afficher les photos avec les boutons */

  renderImagesPreview();
  productFormTitle.textContent = "Modifier le produit";
  cancelEditButton.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function removeProduct(id) {
  if (!confirm("Supprimer définitivement ce produit ?")) return;
  try {
    await deleteDoc(doc(db, "products", id));
    await loadProducts();
  } catch (error) {
    alert("Impossible de supprimer le produit.");
    console.error(error);
  }
}

function resetProductForm() {
  productForm.reset();
  productForm.elements.productId.value = "";
  productForm.elements.stock.value = 1;
  editingImages = [];
  pendingImageFiles = [];
  primaryImageKey = "";

  productImagesInput.value = "";

  clearPendingPreviewUrls();
  imagesPreview.innerHTML = "";

  updateVariantFields(false);
  productFormTitle.textContent = "Ajouter un produit";
  cancelEditButton.classList.add("hidden");
}

cancelEditButton.addEventListener("click", resetProductForm);

async function loadOrders() {
  ordersList.innerHTML = `<p>Chargement...</p>`;
  try {
    const snapshot = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));
    const orders = snapshot.docs.map(document => ({ id: document.id, ...document.data() }));

    if (!orders.length) {
      ordersList.innerHTML = `<p class="empty">Aucune commande.</p>`;
      return;
    }

    ordersList.innerHTML = orders.map(order => `
      <article class="order-card">
        <div class="order-heading">
          <div>
            <strong>Commande #${order.id.slice(0, 8).toUpperCase()}</strong>
            <span>${escapeHtml(order.customerName)} · ${escapeHtml(order.phone)}</span>
          </div>
          <select class="order-status" data-id="${order.id}">
            ${["Nouvelle", "Confirmée", "Expédiée", "Livrée", "Annulée"].map(status =>
              `<option ${order.status === status ? "selected" : ""}>${status}</option>`
            ).join("")}
          </select>
        </div>
        <p>
          <strong>Livraison :</strong>
          ${escapeHtml(
            order.deliveryLabel ||
            "Type de livraison non précisé"
          )}
        </p>

        <p>
          <strong>Wilaya :</strong>
          ${escapeHtml(order.wilaya || "")}

          ${order.commune
            ? `— ${escapeHtml(order.commune)}`
            : ""
          }
        </p>

        ${order.address ? `
          <p>
            <strong>Adresse :</strong>
            ${escapeHtml(order.address)}
          </p>
        ` : ""}
        <ul>
          ${(order.items || []).map(item =>
            `<li>${Number(item.quantity)} × ${escapeHtml(item.name)}
              ${item.size ? `— ${escapeHtml(item.size)}` : ""}
              ${item.color ? `— ${escapeHtml(item.color)}` : ""}
            </li>`
          ).join("")}
        </ul>
        <div class="admin-order-totals">
          <span>
            Produits :
            ${formatPrice(
              order.subtotal ?? order.total
            )}
          </span>
          <span>
            Livraison :
            ${formatPrice(
              order.deliveryPrice || 0
            )}
          </span>

          <strong>
            Total à payer :
            ${formatPrice(order.total)}
          </strong>

        </div>
        <button
          class="danger-button delete-order"
          type="button"
          data-id="${order.id}"
        >
          Supprimer cette commande
        </button>
      </article>
    `).join("");

    document.querySelectorAll(".order-status").forEach(select => {
      select.addEventListener("change", async () => {
        await updateDoc(doc(db, "orders", select.dataset.id), {
          status: select.value,
          updatedAt: serverTimestamp()
        });
      });
    });
    document.querySelectorAll(".delete-order").forEach(button => {
      button.addEventListener("click", async () => {
        const confirmed = confirm(
          "Voulez-vous supprimer définitivement cette commande ?"
        );

        if (!confirmed) {
          return;
        }

        const originalText = button.textContent;

        button.disabled = true;
        button.textContent = "Suppression...";

        try {
          await deleteDoc(
            doc(db, "orders", button.dataset.id)
          );

          await loadOrders();
        } catch (error) {
          console.error(
            "Erreur lors de la suppression :",
            error
          );

          alert(
            "Impossible de supprimer cette commande."
          );

          button.disabled = false;
          button.textContent = originalText;
        }
      });
    });
  } catch (error) {
    ordersList.innerHTML = `<p class="error">Impossible de charger les commandes.</p>`;
    console.error(error);
  }
}

refreshOrders.addEventListener("click", loadOrders);

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".admin-panel").forEach(panel => panel.classList.add("hidden"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.tab}`).classList.remove("hidden");
  });
});
