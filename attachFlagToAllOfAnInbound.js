/**
 * Summary: This is used rarely. Only when an entire inbound is missing a flag. Normally it is a Brea load with the flag 'Toyota' missing. It could be tweaked around
 * to update the flag of one shipping document instead of the entire inbound with a little work.
 * 
 * Use: Update all Placeholder variabled. run in shell.
 * 
 */
exports.attachFlagToAllOfAnInbound = functions.https.onRequest(req => {
  return Promise.all([
    admin.firestore().collection('Tracking-Inventory').where('ShippingDocRef', '==', PLACEHOLDER_SHIPPING_DOC_REF).get(),
    admin.firestore().collection('Tracking-Shipments').doc(PLACEHOLDER_INBOUND_REF).get(),
    admin.firestore().collection('Tracking-Shipments').doc(PLACEHOLDER_INBOUND_REF).collection('Shipping-Documents').doc(PLACEHOLDER_SHIPPING_DOC_REF).get(),
  ]).then(([inventorySnap, inboundDoc, shippingDoc]) => {
    const batch = admin.firestore().batch();

    inventorySnap.forEach(doc => {
      batch.update(admin.firestore().collection('Tracking-Inventory').doc(doc.id), {
        Flag: PLACEHOLDER_FLAG_STRING,
      });
    });

    inboundDoc.data().ContainersShipped.forEach(shortNo => {
      batch.update(admin.firestore().collection('Tracking-Containers').doc(shortNo), {
        Flag: PLACEHOLDER_FLAG_STRING,
      });
    });

    batch.update(shippingDoc.ref, {
      LineItems: shippingDoc.data().LineItems.map(item => ({...item, Flag: PLACEHOLDER_FLAG_STRING})),
    });

    batch.commit().then(() => console.log('SUCCESS')).catch(err => console.log(err));
  });
});