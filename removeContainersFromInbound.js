/**
 * Summary: This is used when there are containers received from an inbound that need to be removed. Not too common, normally an issue with Brea due to their
 * contracts with the auto companies and how they handle the inbound data.
 * 
 * Use: replace the placeholder variables with proper references. if there is only one container, no more code should be added. If more than once container is needed,
 * make sure the splice and delete blocks are updated to handle the correct containers. If the shipping document has made it all the way to an invoice, uncomment the
 * invoice delete line.
 */
exports.removeContainersFromInbound = functions.https.onRequest(async req => {
  const shippingDoc = await admin.firestore().collection('Tracking-Shipments').doc(PLACEHOLDER_INBOUND_ID).collection('Shipping-Documents').doc(PLACEHOLDER_SHIPPING_DOC_ID).get();

  const admin2 = require('firebase-admin');
  const batch = admin.firestore().batch();

  const newLineItems = [...shippingDoc.data().LineItems];

  //this removes the requested items from the shipping document. you may need multile splices if the requested containers are not adjacent items in the array
  newLineItems.splice(ARRAY_POSITION_OF_REQUESTED_REMOVAL, NUMBER_OF_CONTAINERS_TO_REMOVE);

  const inboundRef = admin.firestore().collection('Tracking-Shipments').doc(PLACEHOLDER_INBOUND_ID);

  batch.update(shippingDoc.ref, {LineItems: newLineItems, BillingRef: null, RemainingContainersUntilBillable: 1});

  // uncomment if this shipping doc has made it all the way to invoice before needing to run this function.
  // batch.delete(admin.firestore().collection('Tracking-Invoices').doc('PLACEHOLDER_INVOICE_ID'));

  //update this block with the short number of the container to remove, and the inventory item inside that container
  //if more than once container is being removed from this inbound, repeat this block for each container
  batch.update(inboundRef, {ContainersShipped: admin2.firestore.FieldValue.arrayRemove(PLACEHOLDER_SHORT_NO)});
  batch.delete(admin.firestore().collection('Tracking-Containers').doc(PLACEHOLDER_SHORT_NO));
  batch.delete(admin.firestore().collection('Tracking-Inventory').doc(PLACEHOLDER_INVENTORY_REF_IN_CONTAINER));

  return batch.commit();

});