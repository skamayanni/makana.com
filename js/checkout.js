(() => {
  const form = document.getElementById("checkoutForm");
  const message = document.getElementById("formMessage");
  const button = document.getElementById("submitButton");

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  });

  let product = null;

  try {
    const raw = localStorage.getItem("selectedProduct");
    if (raw) product = JSON.parse(raw);
  } catch (error) {
    console.warn("Could not read selected product.", error);
  }

  function parsePrice(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value !== "string") return null;

    const cleaned = value
      .replace(/,/g, "")
      .replace(/[^\d.]/g, "");

    const amount = Number(cleaned);

    return Number.isFinite(amount) && amount > 0
      ? amount
      : null;
  }

  const price = product ? parsePrice(product.price) : null;

  // Check whether a valid product has been selected.
  if (!product || !product.name || price === null) {
    message.textContent =
      "We couldn't verify the selected item or its displayed price. Please return to the equipment listings and select the item again.";

    message.classList.add("show");
    button.disabled = true;

  } else {
    // Display selected product information.
    const summary = document.getElementById("productSummary");

    summary.innerHTML = "";

    const image = document.createElement("img");
    image.alt = product.name;
    image.src = product.img || "";

    image.onerror = () => {
      image.style.display = "none";
    };

    const copy = document.createElement("div");
    copy.className = "product-copy";

    const title = document.createElement("h3");
    title.textContent = product.name;

    const description = document.createElement("p");
    description.textContent =
      product.desc || "Machinery selected from the Makana marketplace.";

    const itemPrice = document.createElement("strong");
    itemPrice.textContent = money.format(price);

    copy.append(title, description, itemPrice);
    summary.append(image, copy);

    document.getElementById("subtotal").textContent =
      money.format(price);

    document.getElementById("total").textContent =
      money.format(price);
  }

  // Handle checkout form submission.
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    message.classList.remove("show");

    if (!form.reportValidity()) return;
    if (!product || price === null) return;

    const order = {
      productName: product.name,

      customer: {
        name: document.getElementById("customerName").value.trim(),

        email: document.getElementById("customerEmail").value.trim(),

        phone: document.getElementById("customerPhone").value.trim(),

        address: document.getElementById("address").value.trim(),

        city: document.getElementById("city").value.trim(),

        region: document.getElementById("region").value.trim(),

        postalCode: document.getElementById("postalCode").value.trim(),

        country: document.getElementById("country").value.trim(),

        deliveryNotes: document.getElementById("deliveryNotes").value.trim()
      }
    };

    button.disabled = true;
    button.textContent = "Connecting to secure payment…";

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(order)
      });

      if (!response.ok) {
        throw new Error("The payment service is not configured yet.");
      }

      const result = await response.json();

      if (
        !result.checkoutUrl ||
        !/^https:\/\//i.test(result.checkoutUrl)
      ) {
        throw new Error(
          "The payment service did not return a valid secure checkout link."
        );
      }

      window.location.assign(result.checkoutUrl);

    } catch (error) {
      message.textContent =
        "Checkout is not connected to a live payment provider yet. No payment has been taken and your order has not been submitted. Connect a secure server-side payment integration before accepting orders.";

      message.classList.add("show");

      button.disabled = false;

      button.innerHTML =
        'Continue to secure payment <span aria-hidden="true">→</span>';

      console.error(error);
    }
  });

})();