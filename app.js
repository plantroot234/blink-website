// Replace this URL with your Stripe Payment Link
// Dashboard → Payment Links → Create link → copy the https://buy.stripe.com/... URL
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/REPLACE_ME';

function checkout(plan) {
  window.location.href = STRIPE_PAYMENT_LINK;
}
