/**
 * Summary: This is ran when the account, or purchase order are wrong on an inbound.
 * 
 * Use: Replace all Placeholder variables. you can remove PO references, or account references if there are no changes to that property. If there is no invoice
 * generated for this shipping document yet, remove the invoice deletion. If there are multiple shipping documents that need a similar update, repeat the entire 
 * function for each shipping document.
 * 
 */
exports.updateInboundAccountAndPO = functions.https.onRequest(req => {
  return admin.firestore().collection('Tracking-Inventory').where('ShippingDocRef','==', PLACEHOLDER_SHIPPING_DOC_REF).get().then(snap => {
    snap.forEach(doc => {
      //inventory item
      admin.firestore().collection('Tracking-Inventory').doc(doc.id).update({
        PurchaseOrderRef: PLACEHOLDER_PO_REF,
        AccountRef: PLACEHOLDER_ACCOUNT_REF
      })
    });
    //inbound
    admin.firestore().collection('Tracking-Shipments').doc(PLACEHOLDER_INBOUND_REF).update({
      AccountId: PLACEHOLDER_ACCOUNT_REF,
    })
    //shipping doc
    admin.firestore().collection('Tracking-Shipments').doc(PLACEHOLDER_INBOUND_REF).collection('Shipping-Documents').doc(PLACEHOLDER_SHIPPING_DOC_REF).update({
      BillingRef: null,
      GeneratorRef: PLACEHOLDER_LOCATION_REF,
      RemainingContainersUntilBillable: 1,
      PONumber: {
        Ref: PLACEHOLDER_PO_REF,
        Number: PLACEHOLDER_PO_NUMBER
      }
    })
    //invoice
    //remove this line if there is no invoice generated yet.
    admin.firestore().collection('Tracking-Invoices').doc(PLACEHOLDER_INVOICE_REF).delete();
  });

});