/**
 * Summary: this is one of the most used functions. Anytime there is an issue with an item on an inbound, this can be used.
 * One concern is if any of the containers from that inbound were used on any form besides that inbound. It is not common because they normally find the issue 
 * before doing anything with the containers. If there is though, it is just a movement form, and it can be deleted.
 * 
 * Use: replace PLACEHOLDER_INBOUND_ID with the id of the inbound document. run in shell.
 * If any of the containers have been placed on a movement form, find and delete that movement form
 * If there was any other form type used for the containers, rethink total approach.
 */
exports.undoInbound = functions.https.onRequest(req => {
  return admin.firestore().collection('Tracking-Inventory').where('ShipmentInRef','==', PLACEHOLDER_INBOUND_ID).get().then(snap => {
    snap.forEach(doc => {
      const docData = {...doc.data(), id: doc.id};
    admin.firestore().collection('Tracking-Inventory').doc(docData.id).delete();
    admin.firestore().collection('Tracking-Containers').doc(docData.ContainerRef).delete();
    })
    admin.firestore().collection('Tracking-Shipments').doc(PLACEHOLDER_INBOUND_ID).update({
      InProgress: true
    });
  });
});