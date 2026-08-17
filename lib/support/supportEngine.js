// lib/support/supportEngine.js

export async function supportEngine({ message }) {
  // Simple fallback answers for now (to stop the server from crashing)
  const lowerMsg = message.toLowerCase();
  let answer = "I couldn't find a specific answer to that, but please contact support via WhatsApp!";

  if (lowerMsg.includes('staff') || lowerMsg.includes('team')) {
    answer = "To manage staff, go to the Staff page. You can invite, remove, or change roles there.";
  } else if (lowerMsg.includes('order') || lowerMsg.includes('buba')) {
    answer = "Orders are managed in the Orders page. Use the 'New Order' button to create one.";
  } else if (lowerMsg.includes('group') || lowerMsg.includes('aso')) {
    answer = "Groups (Aso-Ebi) are managed in the Groups page.";
  } else if (lowerMsg.includes('subscription') || lowerMsg.includes('plan') || lowerMsg.includes('pay')) {
    answer = "To upgrade or manage your plan, go to the Subscription page.";
  } else if (lowerMsg.includes('production') || lowerMsg.includes('sewing')) {
    answer = "To move an order through production, open the Production page and update the status step by step.";
  }

  return { answer, source: 'fallback' };
}
