/**
 * Summary: This is used when an entire process form was marked as the wrong type (not material. to do that, extra lines will need to be added to update the form with
 * the new material). it will look much like the updateProcessFormFlag function.
 * 
 * Use: Update the placeholder variables with proper values. run in shell.
 */
exports.updateYieldTypeOnProcessForm = functions.https.onRequest(req => {
  const arrayOfQueries = [];
  arrayOfQueries.push(admin.firestore().collection('Tracking-Forms').doc(PLACEHOLDER_PROCESS_FORM_REF).collection('Created-Yields').get());
  arrayOfQueries.push(admin.firestore().collection('Tracking-Forms').doc(PLACEHOLDER_PROCESS_FORM_REF).collection('Inventory-Summary').get());

  return Promise.all(arrayOfQueries).then(values => {
    const yieldDocs = values[0].docs.map(doc => ({ ...doc.data(), id: doc.id }));
    const inventorySummary = values[1].docs.map(doc => ({ ...doc.data(), id: doc.id })).filter(item => item.Yield);
    const batch = admin.firestore().batch();

    batch.update(admin.firestore().collection('Tracking-Forms').doc(PLACEHOLDER_PROCESS_FORM_REF), {
      TypeRef: PLACEHOLDER_TYPE_REF,
    });

    yieldDocs.forEach(yieldDoc => {
      batch.update(admin.firestore().collection('Tracking-Forms').doc(PLACEHOLDER_PROCESS_FORM_REF).collection('Created-Yields').doc(yieldDoc.id), {
        Yield: {
          Name: PLACEHOLDER_TYPE_NAME,
          Ref: PLACEHOLDER_TYPE_REF,
        }
      })
    });

    inventorySummary.forEach(inventory => {
      if (inventory.Yield) {
        batch.update(admin.firestore().collection('Tracking-Forms').doc(PLACEHOLDER_PROCESS_FORM_REF).collection('Inventory-Summary').doc(inventory.id), {
          Type: PLACEHOLDER_TYPE_NAME
        });
        batch.update(admin.firestore().collection('Tracking-Inventory').doc(inventory.ItemRef), {
          Type: {
            Name: PLACEHOLDER_TYPE_NAME,
            Ref: PLACEHOLDER_TYPE_REF,
          }
        })
      }
    });

    return batch.commit().then(() => console.log('success')).catch(error => console.log(error))
  });

});
