/**
 * Summary: This is used to update a shipping document with a new purchase order. This is used when sales has a problem with the invoice being based off the wrong PO.
 * 
 * Use: replace PLACEHOLDER_SHIPPING_DOC_ID, PLACEHOLDER_PURCHASE_ORDER_ID, PLACEHOLDER_PURCHASE_ORDER_NUMBER, PLACEHOLDER_PURCHASE_ORDER_ID, PLACEHOLDER_INVOICE_ID
 * If this was requested before an invoice was generated, comment out the Tracking-Invoices delete call, and run.
 */
exports.changeShippingDocPO = functions.https.onRequest(req => {
  return admin.firestore().collection('Tracking-Inventory').where('ShippingDocRef','==', PLACEHOLDER_SHIPPING_DOC_ID).get().then(snap => {
    const promiseArray = [];
    snap.forEach(doc => {
      promiseArray.push(admin.firestore().collection('Tracking-Inventory').doc(doc.id).update({
        PurchaseOrderRef: PLACEHOLDER_PURCHASE_ORDER_ID
      }));
    })
    promiseArray.push(admin.firestore().collection('Tracking-Shipments').doc(PLACEHOLDER_INBOUND_ID).collection('Shipping-Documents').doc(PLACEHOLDER_SHIPPING_DOC_ID).update({
      PONumber: {
        Number: PLACEHOLDER_PURCHASE_ORDER_NUMBER,
        Ref: PLACEHOLDER_PURCHASE_ORDER_ID
      },
      RemainingContainersUntilBillable: 1,
    BillingRef: null,
    }))
    promiseArray.push(admin.firestore().collection('Tracking-Invoices').doc(PLACEHOLDER_INVOICE_ID).delete())
    return Promise.all(promiseArray).then(() => console.log('success')).catch(error => console.log(error))
  });
});