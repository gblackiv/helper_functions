
//this is in order to find a container on an outbound
exports.test2 = functions.https.onRequest(req => {
  return admin.firestore().collectionGroup('Lines').get().then(snap => {
    const returnedArray = [];
    snap.forEach(doc => {
      const docData = { ...doc.data(), outboundRef: doc.ref.parent.parent.id };
      docData.AddedContainers.forEach(container => {
        if (container.ShortNo === '621114' || container.ShortNo === '620286' || container.ShortNo === '619675') {
          returnedArray.push(docData.outboundRef);
        }
      });
    });
    return console.log(returnedArray);
  })
})



// This is what returns a process form back to before it was completed
exports.test = functions.https.onRequest(req => {
  const admin2 = require('firebase-admin');
  return admin.firestore().collection('Tracking-Forms').doc('AMnRtZvnYojeod6St6hf').collection('Inventory-Summary').get().then(snap => {
    const batch = admin.firestore().batch();
    batch.delete(admin.firestore().collection('Tracking-Containers').doc('200207-OXJHA'));
    batch.delete(admin.firestore().collection('Tracking-Containers').doc('200211-QOMSI'));
    batch.delete(admin.firestore().collection('Tracking-Containers').doc('200211-REMTU'));
    batch.delete(admin.firestore().collection('Tracking-Containers').doc('200211-KPGIP'));
    batch.delete(admin.firestore().collection('Tracking-Containers').doc('200211-NTTHE'));
    batch.delete(admin.firestore().collection('Tracking-Containers').doc('200211-WYMAX'));
    batch.update(admin.firestore().collection('Tracking-Forms').doc('AMnRtZvnYojeod6St6hf'), {
      Completed: false
    });

    snap.forEach(doc => {
      const docData = doc.data();
      if (docData.Yield) {
        batch.delete(admin.firestore().collection('Tracking-Inventory').doc(docData.ItemRef));
      }
      else {
        batch.update(admin.firestore().collection('Tracking-Inventory').doc(docData.ItemRef), {
          Weight: docData.Weight,
          FormHistory: admin2.firestore.FieldValue.arrayRemove('AMnRtZvnYojeod6St6hf'),
          ContainerRef: docData.ContainerRef,
        });
        batch.update(admin.firestore().collection('Tracking-Containers').doc(docData.ContainerRef), {
          AccumulationStartDate: new Date(),
          Active: true,
          FacilityUnitRef: '7QQNvzla6qyMkLSNPCEK',
          Flag: 'Toyota',
          MaterialRef: 'S3zQFQfDuMuXlvgNPj4C',
          NetWeight: docData.Weight,
          InventoryItems: admin2.firestore.FieldValue.arrayUnion(docData.ItemRef),
        });
        batch.delete(admin.firestore().collection('Tracking-Forms').doc('AMnRtZvnYojeod6St6hf').collection('Inventory-Summary').doc(doc.id));
      }
    })
    return batch.commit().then(() => 'success').catch(error => console.log(error))
  })
})

// This function assigned flags to all items that were sorted and lost their flag. it used the inbound container and the purchase order to do it
exports.test = functions.https.onRequest(req => {
  return Promise.all([
    admin.firestore().collection('Tracking-Inventory').where('Source', '==', 'Sort').where('Flag', '==', '').get(),
    admin.firestore().collection('Tracking-Materials').get(),
  ]).then(promises => {
    const materialMap = {};
    promises[1].forEach(doc => {
      materialMap[doc.id] = { ...doc.data(), id: doc.id };
    });
    return Promise.all(promises[0].docs.map(doc => {
      const itemData = { ...doc.data(), id: doc.id };
      return admin.firestore().runTransaction(transaction => {
        const shippingDoc = transaction.get(admin.firestore().collection('Tracking-Shipments').doc(itemData.ShipmentInRef).collection('Shipping-Documents').doc(itemData.ShippingDocRef));
        const purchaseOrder = transaction.get(admin.firestore().collection('CRM-Accounts').doc(itemData.AccountRef).collection('Purchase-Orders').doc(itemData.PurchaseOrderRef));
        return Promise.all([shippingDoc, purchaseOrder]).then(values => {
          const shippingData = { ...values[0].data(), id: values[0].id };
          const poData = { ...values[1].data(), id: values[1].id }
          const flagFromShipping = shippingData.LineItems.find(item => item.PieceNumber === itemData.IncomingPieceNo).Flag;
          const flagFromPO = poData.ApprovedTypes[itemData.Type.Ref] ? poData.ApprovedTypes[itemData.Type.Ref].Flag : null;
          let matchedFlag = null;
          if (materialMap[itemData.Material.Ref].Flags.find(flagObj => flagObj.Name === flagFromShipping)) {
            matchedFlag = flagFromShipping;
          } else if (materialMap[itemData.Material.Ref].Flags.find(flagObj => flagObj.Name === flagFromPO)) {
            matchedFlag = flagFromPO;
          }
          if (matchedFlag) {
            return transaction.update(admin.firestore().collection('Tracking-Inventory').doc(itemData.id), {
              Flag: matchedFlag,
            })
          }
        })
      })
    })).then(() => ({ success: true }))
  })
});

//this was used to attach DateShipped to all invoices
exports.test = functions.https.onRequest(req => {
  return Promise.all([
    admin.firestore().collection('Tracking-Invoices').get(),
    admin.firestore().collectionGroup('Shipping-Documents').get(),
  ]).then(snaps => {
    const arrayOfInvoices = snaps[0].docs.map(doc => ({
      ...doc.data(), id: doc.id,
    }));

    const mapOfShippingDocs = {};
    snaps[1].forEach(doc => {
      mapOfShippingDocs[doc.id] = { ...doc.data(), id: doc.id };
    });

    const arrayOfWrites = [];
    arrayOfInvoices.forEach(invoice => {
      arrayOfWrites.push(admin.firestore().collection('Tracking-Invoices').doc(invoice.id).update({
        DateShipped: mapOfShippingDocs[invoice.ShippingDocRef] ? mapOfShippingDocs[invoice.ShippingDocRef].System.CreatedOn : null,
      }))
    });
    return Promise.all(arrayOfWrites).then(() => console.log('success')).catch(error => console.log(error));
  })
})

//The next 2 functions were used to fix PO's to their new format. There were PO's that got made in the old format after the change.
exports.test = functions.https.onRequest(req => {
  const firestore = admin.firestore();

  return firestore.collectionGroup('Purchase-Orders').get().then(snap => {
    const messedUpPOs = []
    snap.forEach(doc => {
      const data = { ...doc.data(), accountId: doc.ref.parent.parent.id, poId: doc.id };
      for (const typeId in data.ApprovedTypes) {
        for (const shouldBeFlag in data.ApprovedTypes[typeId]) {
          if (typeof data.ApprovedTypes[typeId][shouldBeFlag] !== 'object') {
            console.log([data.accountId, data.poId])
            messedUpPOs.push([data.accountId, data.poId]);
            break;
          }
        }
      }
    });
    return console.log(messedUpPOs.length);
  })
})
exports.fixTest = functions.https.onRequest(req => {
  const firestore = admin.firestore();
  const arrayOfTransactions = [];

  arrayOfTransactions.push(firestore.runTransaction(transaction => {
    return transaction.get(firestore.collection('CRM-Accounts').doc('2BMXr1KQlbjBAElQ8kSQ').collection('Purchase-Orders').doc('KOYqNoDqQAkGuBsMzyE6')).then(poDoc => {
      const oldApprovedTypes = poDoc.data().ApprovedTypes;
      const newApprovedTypes = {}
      for (const typeId in oldApprovedTypes) {
        newApprovedTypes[typeId] = { [oldApprovedTypes[typeId].Flag || 'none']: oldApprovedTypes[typeId] };
      }
      return transaction.update(firestore.collection('CRM-Accounts').doc('2BMXr1KQlbjBAElQ8kSQ').collection('Purchase-Orders').doc('KOYqNoDqQAkGuBsMzyE6'), {
        ApprovedTypes: newApprovedTypes
      });
    })
  }));
  arrayOfTransactions.push(firestore.runTransaction(transaction => {
    return transaction.get(firestore.collection('CRM-Accounts').doc('HfWvLmBeby18QG19iWs3').collection('Purchase-Orders').doc('IMNCPu6hWJ9jWHATgATE')).then(poDoc => {
      const oldApprovedTypes = poDoc.data().ApprovedTypes;
      const newApprovedTypes = {}
      for (const typeId in oldApprovedTypes) {
        newApprovedTypes[typeId] = { [oldApprovedTypes[typeId].Flag || 'none']: oldApprovedTypes[typeId] };
      }
      return transaction.update(firestore.collection('CRM-Accounts').doc('HfWvLmBeby18QG19iWs3').collection('Purchase-Orders').doc('IMNCPu6hWJ9jWHATgATE'), {
        ApprovedTypes: newApprovedTypes
      });
    })
  }));
  arrayOfTransactions.push(firestore.runTransaction(transaction => {
    return transaction.get(firestore.collection('CRM-Accounts').doc('QG2OxzZyFk9YeLr97oPU').collection('Purchase-Orders').doc('lVPA5Y7dtUPSo7h8jkdQ')).then(poDoc => {
      const oldApprovedTypes = poDoc.data().ApprovedTypes;
      const newApprovedTypes = {}
      for (const typeId in oldApprovedTypes) {
        newApprovedTypes[typeId] = { [oldApprovedTypes[typeId].Flag || 'none']: oldApprovedTypes[typeId] };
      }
      return transaction.update(firestore.collection('CRM-Accounts').doc('QG2OxzZyFk9YeLr97oPU').collection('Purchase-Orders').doc('lVPA5Y7dtUPSo7h8jkdQ'), {
        ApprovedTypes: newApprovedTypes
      });
    })
  }));
  arrayOfTransactions.push(firestore.runTransaction(transaction => {
    return transaction.get(firestore.collection('CRM-Accounts').doc('u1BKa5LgPe1ajNwfy8bK').collection('Purchase-Orders').doc('00X552I58UFQo2AgxMba')).then(poDoc => {
      const oldApprovedTypes = poDoc.data().ApprovedTypes;
      const newApprovedTypes = {}
      for (const typeId in oldApprovedTypes) {
        newApprovedTypes[typeId] = { [oldApprovedTypes[typeId].Flag || 'none']: oldApprovedTypes[typeId] };
      }
      return transaction.update(firestore.collection('CRM-Accounts').doc('u1BKa5LgPe1ajNwfy8bK').collection('Purchase-Orders').doc('00X552I58UFQo2AgxMba'), {
        ApprovedTypes: newApprovedTypes
      });
    })
  }));
  arrayOfTransactions.push(firestore.runTransaction(transaction => {
    return transaction.get(firestore.collection('CRM-Accounts').doc('u1BKa5LgPe1ajNwfy8bK').collection('Purchase-Orders').doc('06lxan1iZvUmozRvEl0a')).then(poDoc => {
      const oldApprovedTypes = poDoc.data().ApprovedTypes;
      const newApprovedTypes = {}
      for (const typeId in oldApprovedTypes) {
        newApprovedTypes[typeId] = { [oldApprovedTypes[typeId].Flag || 'none']: oldApprovedTypes[typeId] };
      }
      return transaction.update(firestore.collection('CRM-Accounts').doc('u1BKa5LgPe1ajNwfy8bK').collection('Purchase-Orders').doc('06lxan1iZvUmozRvEl0a'), {
        ApprovedTypes: newApprovedTypes
      });
    })
  }));
  arrayOfTransactions.push(firestore.runTransaction(transaction => {
    return transaction.get(firestore.collection('CRM-Accounts').doc('u1BKa5LgPe1ajNwfy8bK').collection('Purchase-Orders').doc('GmPBgLOZKhG970SBLMAO')).then(poDoc => {
      const oldApprovedTypes = poDoc.data().ApprovedTypes;
      const newApprovedTypes = {}
      for (const typeId in oldApprovedTypes) {
        newApprovedTypes[typeId] = { [oldApprovedTypes[typeId].Flag || 'none']: oldApprovedTypes[typeId] };
      }
      return transaction.update(firestore.collection('CRM-Accounts').doc('u1BKa5LgPe1ajNwfy8bK').collection('Purchase-Orders').doc('GmPBgLOZKhG970SBLMAO'), {
        ApprovedTypes: newApprovedTypes
      });
    })
  }));
  arrayOfTransactions.push(firestore.runTransaction(transaction => {
    return transaction.get(firestore.collection('CRM-Accounts').doc('u1BKa5LgPe1ajNwfy8bK').collection('Purchase-Orders').doc('YqufpfZ1m2IfZTdtKuF0')).then(poDoc => {
      const oldApprovedTypes = poDoc.data().ApprovedTypes;
      const newApprovedTypes = {}
      for (const typeId in oldApprovedTypes) {
        newApprovedTypes[typeId] = { [oldApprovedTypes[typeId].Flag || 'none']: oldApprovedTypes[typeId] };
      }
      return transaction.update(firestore.collection('CRM-Accounts').doc('u1BKa5LgPe1ajNwfy8bK').collection('Purchase-Orders').doc('YqufpfZ1m2IfZTdtKuF0'), {
        ApprovedTypes: newApprovedTypes
      });
    })
  }));
  arrayOfTransactions.push(firestore.runTransaction(transaction => {
    return transaction.get(firestore.collection('CRM-Accounts').doc('u1BKa5LgPe1ajNwfy8bK').collection('Purchase-Orders').doc('ZpNTcgmPgtOT8ZmxWNpc')).then(poDoc => {
      const oldApprovedTypes = poDoc.data().ApprovedTypes;
      const newApprovedTypes = {}
      for (const typeId in oldApprovedTypes) {
        newApprovedTypes[typeId] = { [oldApprovedTypes[typeId].Flag || 'none']: oldApprovedTypes[typeId] };
      }
      return transaction.update(firestore.collection('CRM-Accounts').doc('u1BKa5LgPe1ajNwfy8bK').collection('Purchase-Orders').doc('ZpNTcgmPgtOT8ZmxWNpc'), {
        ApprovedTypes: newApprovedTypes
      });
    })
  }));
  arrayOfTransactions.push(firestore.runTransaction(transaction => {
    return transaction.get(firestore.collection('CRM-Accounts').doc('u1BKa5LgPe1ajNwfy8bK').collection('Purchase-Orders').doc('uOiE5Tn5M875rce9SmbP')).then(poDoc => {
      const oldApprovedTypes = poDoc.data().ApprovedTypes;
      const newApprovedTypes = {}
      for (const typeId in oldApprovedTypes) {
        newApprovedTypes[typeId] = { [oldApprovedTypes[typeId].Flag || 'none']: oldApprovedTypes[typeId] };
      }
      return transaction.update(firestore.collection('CRM-Accounts').doc('u1BKa5LgPe1ajNwfy8bK').collection('Purchase-Orders').doc('uOiE5Tn5M875rce9SmbP'), {
        ApprovedTypes: newApprovedTypes
      });
    })
  }));



  return Promise.all(arrayOfTransactions).then(values => {
    return console.log('success')
  }).catch(error => {
    return console.log(error)
  })
})
