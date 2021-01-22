/**
 * Summary: This is used to attach a flag to the process form referenced, and all of the inventory items that came out the yield end. 
 * 
 * Use: Update all placeholder variables. The PLACEHOLDER_ARRAY_OF_SHORT_NUMBERS is strictly the containers that were created by the process form. all other containers
 * ('existing containers') should already have a flag attached. check those containers flags and ensure there isnt a conflict in the flags being updated and their
 * original flags. Run in shell
 */
exports.updateProcessFormFlag = functions.https.onRequest(req => {
  return admin.firestore().collection('Tracking-Forms').doc(PLACEHOLDER_PROCESS_FORM_REF).collection('Inventory-Summary').get().then(snap => {
    const batch = admin.firestore().batch();
     batch.update(admin.firestore().collection('Tracking-Forms').doc(PLACEHOLDER_PROCESS_FORM_REF), {
       Flag: PLACEHOLDER_FLAG_STRING,
     });
     snap.forEach(doc => {
       if(doc.data().Yield){
         batch.update(admin.firestore().collection('Tracking-Inventory').doc(doc.data().ItemRef), {
           Flag: PLACEHOLDER_FLAG_STRING,
         });
         batch.update(doc.ref, {
           Flag: PLACEHOLDER_FLAG_STRING,
         });
       }
     });

    PLACEHOLDER_ARRAY_OF_SHORT_NUMBERS.forEach(shortNo => {
      batch.update(admin.firestore().collection('Tracking-Containers').doc(), {
        Flag: PLACEHOLDER_FLAG_STRING,
      }); 
     });
     
     return batch.commit().then(() => console.log('success')).catch(err =>  console.log('error', err))
   })
});