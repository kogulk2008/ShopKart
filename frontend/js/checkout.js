/* ============================================================
   SHOPKART — checkout.js
   Multi-step checkout: Address -> Delivery -> Payment -> Confirm
   Orders are created server-side (stock is validated and
   decremented atomically in the database). No real payment is
   processed — this is a demo checkout flow.
   ============================================================ */

let SK_SELECTED_PAYMENT = 'upi';

/** Fetches orders from the API — the user's own orders, or all orders if they're a seller. */
async function getOrdersFromAPI(){
  try{
    return await apiFetch('/orders');
  }catch(e){
    showToast(e.message || 'Could not load orders.', 'error');
    return [];
  }
}

async function updateOrderStatus(orderCode, status){
  try{
    return await apiFetch(`/orders/${orderCode}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }catch(e){
    showToast(e.message || 'Could not update order status.', 'error');
    return null;
  }
}

function initCheckoutPage(){
  const wrap = document.getElementById('checkoutWrap');
  if(!wrap) return;
  if(!requireAuth()) return;

  if(!getCart().length){
    showToast('Your cart is empty.', 'info');
    setTimeout(() => location.href = 'cart.html', 800);
    return;
  }

  // Prefill address from the user's last saved address, if any
  const user = getCurrentUser();
  if(user){
    document.getElementById('addrName').value = user.name || '';
    document.getElementById('addrPhone').value = user.phone || '';
    if(user.addresses && user.addresses.length){
      const last = user.addresses[user.addresses.length - 1];
      document.getElementById('addrLine').value = last.line || '';
      document.getElementById('addrCity').value = last.city || '';
      document.getElementById('addrState').value = last.state || '';
      document.getElementById('addrPin').value = last.pin || '';
    }
  }

  renderCheckoutSummary();
  goToStep(1);

  document.getElementById('addressForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveAddressAndContinue();
  });

  document.querySelectorAll('#step-3 .pay-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('#step-3 .pay-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      SK_SELECTED_PAYMENT = opt.dataset.method;
    });
  });
}

function renderCheckoutSummary(){
  const cart = getCart();
  const listEl = document.getElementById('checkoutItemsSummary');
  if(listEl){
    listEl.innerHTML = cart.map(item => {
      const p = getProductById(item.id);
      if(!p) return '';
      return `<div class="d-flex justify-content-between align-items-center mb-2">
        <div class="d-flex align-items-center gap-2">
          <img src="${p.image}" style="width:42px;height:42px;object-fit:contain;background:var(--sk-navy-800);border-radius:8px;padding:4px;">
          <div>
            <div class="small fw-semibold">${p.name}</div>
            <div class="text-mist-dim" style="font-size:.78rem;">Qty: ${item.qty}</div>
          </div>
        </div>
        <span class="small">₹${(p.price * item.qty).toLocaleString('en-IN')}</span>
      </div>`;
    }).join('');
  }
  renderCartSummaryForCheckout();
}

function renderCartSummaryForCheckout(){
  const subtotal = cartSubtotal();
  const originalTotal = cartOriginalTotal();
  const discount = Math.max(0, originalTotal - subtotal);
  const delivery = subtotal > 0 && subtotal < 999 ? 79 : 0;
  const total = subtotal + delivery;
  const setText = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  setText('coSubtotal', `₹${subtotal.toLocaleString('en-IN')}`);
  setText('coDiscount', `- ₹${discount.toLocaleString('en-IN')}`);
  setText('coDelivery', delivery === 0 ? 'FREE' : `₹${delivery}`);
  setText('coTotal', `₹${total.toLocaleString('en-IN')}`);
  return { subtotal, discount, delivery, total };
}

function goToStep(step){
  document.querySelectorAll('.checkout-step-panel').forEach(p => p.classList.add('d-none'));
  const panel = document.getElementById(`step-${step}`);
  if(panel) panel.classList.remove('d-none');

  document.querySelectorAll('.checkout-steps .step').forEach(el => {
    const s = Number(el.dataset.step);
    el.classList.toggle('active', s === step);
    el.classList.toggle('done', s < step);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saveAddressAndContinue(){
  const address = {
    name: document.getElementById('addrName').value.trim(),
    phone: document.getElementById('addrPhone').value.trim(),
    line: document.getElementById('addrLine').value.trim(),
    city: document.getElementById('addrCity').value.trim(),
    state: document.getElementById('addrState').value.trim(),
    pin: document.getElementById('addrPin').value.trim()
  };
  sessionStorage.setItem('sk_checkout_address', JSON.stringify(address));
  goToStep(2);
}

function confirmDeliveryAndContinue(){
  goToStep(3);
}

async function placeOrder(){
  const address = JSON.parse(
    sessionStorage.getItem('sk_checkout_address') || '{}'
  );

  if(!getCart().length){
    showToast('Your cart is empty.', 'info');
    return;
  }

  const placeBtn = document.getElementById('placeOrderBtn');

  if(placeBtn){
    placeBtn.disabled = true;
    placeBtn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin me-1"></i>Preparing payment...';
  }

  try{

    // =====================================================
    // CASH ON DELIVERY
    // =====================================================

    if(SK_SELECTED_PAYMENT === 'cod'){

      const order = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          address: address,
          payment: 'cod'
        })
      });

      await Promise.all([
        loadProductsCache(),
        loadCartCache()
      ]);

      updateNavBadges();

      sessionStorage.removeItem('sk_checkout_address');

      document.getElementById('confirmOrderId').textContent =
        order.id;

      document.getElementById('confirmOrderTotal').textContent =
        `₹${order.totals.total.toLocaleString('en-IN')}`;

      goToStep(4);

      return;
    }


    // =====================================================
    // RAZORPAY PAYMENT
    // =====================================================

    const paymentOrder = await apiFetch('/payment/create-order', {
      method: 'POST',
      body: JSON.stringify({})
    });

    if(!paymentOrder || !paymentOrder.razorpay_order_id){
      throw new Error('Could not create Razorpay payment order.');
    }


    // =====================================================
    // RAZORPAY CHECKOUT OPTIONS
    // =====================================================

    const options = {

      key: paymentOrder.key_id,

      amount: paymentOrder.amount,

      currency: paymentOrder.currency,

      name: 'ShopKart',

      description: 'ShopKart Order',

      order_id: paymentOrder.razorpay_order_id,


      // ===================================================
      // PAYMENT SUCCESS
      // ===================================================

      handler: async function(response){

        try{

          if(placeBtn){
            placeBtn.innerHTML =
              '<i class="fa-solid fa-spinner fa-spin me-1"></i>Verifying payment...';
          }


          // Send Razorpay response to our Flask server
          const verifiedOrder = await apiFetch(
            '/payment/verify-payment',
            {
              method: 'POST',

              body: JSON.stringify({

                razorpay_order_id:
                  response.razorpay_order_id,

                razorpay_payment_id:
                  response.razorpay_payment_id,

                razorpay_signature:
                  response.razorpay_signature,

                address: address

              })
            }
          );


          // ===============================================
          // Payment verified + order created
          // ===============================================

          await Promise.all([
            loadProductsCache(),
            loadCartCache()
          ]);

          updateNavBadges();

          sessionStorage.removeItem(
            'sk_checkout_address'
          );


          // Show confirmation
          const order = verifiedOrder.order;

          document.getElementById(
            'confirmOrderId'
          ).textContent = order.id;

          document.getElementById(
            'confirmOrderTotal'
          ).textContent =
            `₹${order.totals.total.toLocaleString('en-IN')}`;

          goToStep(4);


        }catch(error){

          console.error(
            'Payment verification error:',
            error
          );

          showToast(
            error.message ||
            'Payment verification failed.',
            'error'
          );

          if(placeBtn){
            placeBtn.disabled = false;
            placeBtn.innerHTML =
              'Pay & Place Order <i class="fa-solid fa-lock ms-1"></i>';
          }
        }
      },


      // ===================================================
      // CUSTOMER DETAILS
      // ===================================================

      prefill: {

        name: address.name || '',

        contact: address.phone || '',

        email:
          (getCurrentUser() &&
           getCurrentUser().email) || ''

      },


      notes: {

        address:
          `${address.line || ''}, ${address.city || ''}, ${address.state || ''} - ${address.pin || ''}`

      },


      // ===================================================
      // CHECKOUT THEME
      // ===================================================

      theme: {
        color: '#0d6efd'
      },


      // ===================================================
      // PAYMENT MODAL CLOSED
      // ===================================================

      modal: {

        ondismiss: function(){

          if(placeBtn){

            placeBtn.disabled = false;

            placeBtn.innerHTML =
              'Pay & Place Order <i class="fa-solid fa-lock ms-1"></i>';

          }

          showToast(
            'Payment window closed.',
            'info'
          );
        }

      }

    };


    // =====================================================
    // OPEN RAZORPAY
    // =====================================================

    const razorpay = new Razorpay(options);


    razorpay.on('payment.failed', function(response){

      console.error(
        'Razorpay payment failed:',
        response.error
      );

      showToast(
        response.error.description ||
        'Payment failed. Please try again.',
        'error'
      );

      if(placeBtn){

        placeBtn.disabled = false;

        placeBtn.innerHTML =
          'Pay & Place Order <i class="fa-solid fa-lock ms-1"></i>';

      }

    });


    razorpay.open();


  }catch(e){

    console.error(
      'Checkout payment error:',
      e
    );

    showToast(
      e.message ||
      'Could not start payment.',
      'error'
    );

    if(placeBtn){

      placeBtn.disabled = false;

      placeBtn.innerHTML =
        'Pay & Place Order <i class="fa-solid fa-lock ms-1"></i>';

    }

  }
}

onDataReady(initCheckoutPage);
