/**
 * Summary: This is used to correct issues with a process form. Its goal is to return all the containers and items to the state before the process form. 
 * It is one of the most used functions. As long as the items from the process form havent gone onto any other forms, this is the solution to any issues.
 * It will undo everything that marking the form as complete did, allowing the users to correct the data and resubmit the form.
 * There is ONE issue with this function the way it is. If a process form has yield containers that are marked as 'Existing Containers' (those that were not created by
 * the process form) you must manually go to the container doc and update the weight after running this function. add up the weight of the remaining inventory items in
 * the container and set the net weight before resubmitting the form.
 * 
 * Use: Replace all the placeholder variables with the proper values. The PLACEHOLDER_CONTAINER_REF_ARRAY is an array of all the contianers that were not marked as
 * 'existing containers'. those must be handled in the method mentioned below.
 * As stated above: There is ONE issue with this function the way it is. If a process form has yield containers that are marked as 'Existing Containers' (those that 
 * were not created by the process form) you must manually go to the container doc and update the weight after running this function. add up the weight of the 
 * remaining inventory items in the container and set the net weight before resubmitting the form.
 * 
 */
exports.undoProcessForm = functions.https.onRequest(req => {
  const admin2 = require('firebase-admin');
  return admin.firestore().collection('Tracking-Forms').doc(PLACEHOLDER_FORM_REF).collection('Inventory-Summary').get().then(snap => {
    const batch = admin.firestore().batch();
    // this is just the list of containers that were created BY the process form (ones not marked as 'existing containers'). Those must be handled as mentioned in the summary
    const arrayOfContainersToDelete = PLACEHOLDER_CONTAINER_REF_ARRAY // ex: ['Z13YX-201112','Y5128-201112', '4YXVW-201112'];

    arrayOfContainersToDelete.forEach(containerRef => batch.delete(admin.firestore().collection('Tracking-Containers').doc(containerRef)))

    batch.update(admin.firestore().collection('Tracking-Forms').doc(PLACEHOLDER_FORM_REF), {
      Completed: false
    });

    snap.forEach(doc => {
      const docData = doc.data();
      if (docData.Yield) {
        batch.delete(admin.firestore().collection('Tracking-Inventory').doc(docData.ItemRef));
        if(!arrayOfContainersToDelete.find(ref => ref === docData.ContainerRef)){
          batch.update(admin.firestore().collection('Tracking-Containers').doc(docData.ContainerRef), {
            InventoryItems: admin2.firestore.FieldValue.arrayRemove(docData.ItemRef),
          });
        }
      }
      else {
        batch.update(admin.firestore().collection('Tracking-Inventory').doc(docData.ItemRef), {
          Weight: docData.Weight,
          FormHistory: admin2.firestore.FieldValue.arrayRemove(PLACEHOLDER_FORM_REF),
          ContainerRef: docData.ContainerRef,
        });
        batch.update(admin.firestore().collection('Tracking-Containers').doc(docData.ContainerRef), {
          AccumulationStartDate: new Date(),
          Active: true,
          FacilityUnitRef: PLACEHOLDER_FACILITY_UNIT_REF,
          Flag: '',
          MaterialRef: PLACEHOLDER_MATERIAL_REF,
          NetWeight: docData.Weight,
          InventoryItems: admin2.firestore.FieldValue.arrayUnion(docData.ItemRef),
        });
        batch.delete(admin.firestore().collection('Tracking-Forms').doc(PLACEHOLDER_FORM_REF).collection('Inventory-Summary').doc(doc.id));
      }
    })
    return batch.commit().then(() => 'success').catch(error => console.log(error))
  })
});