import { firebaseFunctions } from "~/composables/firebase/init.js"
import { query, collection, addDoc, getDocs, getDoc, doc, updateDoc, setDoc, deleteDoc } from "firebase/firestore"
import { useAuth } from '@/stores/auth'


// Create
export const createUserData = async (userId, payload) => {
  try {
    // crée content, id, email, etc.
    // si non existant on update grâce à { merge: true }
    await setDoc(doc(firebaseFunctions.db, "users", userId), payload)
  } catch (e) {
    console.error("Error adding document: ", e)
  }
}

// Update
export const updateUser = async (userId, payload) => {
  try {
    // crée si non existant ou rajoute grâce à { merge: true }
    await setDoc(doc(firebaseFunctions.db, "users", userId), payload, { merge: true })
    return true
  } catch (e) {
    console.error("Error adding document: ", e)
    return false
  }
}

// Update global user profil
export const updateUserProfile = async (displayName, photoURL) => {
  const auth = firebaseFunctions.getAuth() // objet d'instance de firebase
  const currentUser = computed(() => auth.currentUser) // tableau entier du profil user
  console.log('currentUser', currentUser.value)
  // maj du profil global
  await firebaseFunctions.updateProfile(currentUser.value, { displayName, photoURL })
  // maj du profil firestore
  setUserDb(currentUser.value)
  // console.log(currentUser.value, 'currentUser')
}

// READ
export const getUsers = async (userId) => {
  let user = ref(null)
  const docRef = doc(firebaseFunctions.db, "users", userId)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    user.value = docSnap.data()
    // console.log(user.value, 'getUsers')
  } else {
    // doc.data() will be undefined in this case
    user.value = null
    // console.log("No such document!", user.value)
    return user.value
  }
  // console.log("data!", data)

  return user.value
}
// READ
export const getUserTokens = async (userId) => {
  let user = ref(null)
  const docRef = doc(firebaseFunctions.db, "userTokens", userId)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    user.value = docSnap.data()
  } else {
    user.value = null
    return user.value
  }

  return user.value
}
// READ
export const getUserReview = async (userId) => {
  let user = ref(null)
  const docRef = doc(firebaseFunctions.db, "userReview", userId)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    user.value = docSnap.data()
  } else {
    // doc.data() will be undefined in this case
    user.value = null
    return user.value
  }

  return user.value
}

// READ
export const getUsersCollection = async (dbCollection) => {
  const q = query(collection(firebaseFunctions.db, dbCollection))
  const querySnapshot = await getDocs(q)

  return querySnapshot.docs.map((doc) => {
    // doc.data() is never undefined for query doc snapshots
    // console.log(doc.id, " => ", doc.data())
    return {
      id: doc.id,
      ...doc.data()
    }
  })
}

// Delete user
export const deleteUser = async (userId) => {
  deleteDoc(doc(firebaseFunctions.db, "users", userId))
  .then((e) => {
    console.log(e, 'deleteUser callback')
  })
}

// Create Firestore userDb with getUsers, createUserData, updateUser functions
export const setUserDb = async (user) => {
  // firebaseFunctions.onAuthStateChanged(firebaseFunctions.auth, (user) => {
  const authStore = useAuth()
  
  if (user) {
  const uid = user.uid
  // console.log('user', user)

  let userData = reactive({
    uid,
    email: user?.email,
    displayName: user?.displayName || null,
    role: "user",
    age: null,
    plan: null, // si abonné ou pas
  })

  await getUsers(uid)
  .then(async (res) => {
    // res retourne soit null soit le user trouvé
    // Si le user est introuvable on le crée
    // console.log(res,'res getUsers')
    if (res != null) {
      console.log('createUserData')
      createUserData(uid, userData)
      .then(() => {
        authStore.setUser(userData)
      })
    }
  }
}
