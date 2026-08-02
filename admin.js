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

const formatPrice = value =>
  new Intl.NumberFormat("fr-DZ").format(Number(value || 0)) + " DA";

const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const csvToArray = value =>
  value.split(",").map(v => v.trim()).filter(Boolean);

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
    const selectedFiles = productForm.elements.productImages.files;

    let imageUrls = [];

    if (selectedFiles.length > 0) {
      productStatus.textContent = "Envoi des photos...";

      imageUrls = await uploadMultipleImages(selectedFiles);
    } else if (productId) {
      const existingProduct = products.find(
        product => product.id === productId
      );

      imageUrls =
        existingProduct?.images ||
        (existingProduct?.imageUrl ? [existingProduct.imageUrl] : []);
    }

    if (imageUrls.length === 0) {
      throw new Error("Sélectionnez au moins une photo du produit.");
    }
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
  f.imageUrl.value = product.imageUrl || "";
  f.featured.checked = Boolean(product.featured);
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
        <p>${escapeHtml(order.wilaya)}, ${escapeHtml(order.commune)} — ${escapeHtml(order.address)}</p>
        <ul>
          ${(order.items || []).map(item =>
            `<li>${Number(item.quantity)} × ${escapeHtml(item.name)}
              ${item.size ? `— ${escapeHtml(item.size)}` : ""}
              ${item.color ? `— ${escapeHtml(item.color)}` : ""}
            </li>`
          ).join("")}
        </ul>
        <strong>Total : ${formatPrice(order.total)}</strong>
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
