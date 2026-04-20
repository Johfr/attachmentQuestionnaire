import { firebaseClient } from "~/composables/firebase/useFirebaseClient.js"


// Créer un user avec email & mdp
export const createUserAccountWithEmailAndPassword = async (email, password) => {
  try {
    const userCredential = await firebaseClient.createUserWithEmailAndPassword(firebaseClient.auth, email, password)
    return {
      success: true,
      user: userCredential.user,
    }
  } catch (error) {
    return {
      success: false,
      errorCode: error?.code || null,
      error: error?.message || 'Erreur pendant la creation du compte.',
    }
  }
}

// connexion avec email & mdp
export const signInUserWithEmailAndPassword = async (email, password) => {
  try {
    const userCredential = await firebaseClient.signInWithEmailAndPassword(firebaseClient.auth, email, password)
    return {
      success: true,
      user: userCredential.user,
    }
  } catch(error) {
    return {
      success: false,
      errorCode: error?.code || null,
      error: error?.message || 'Erreur pendant la connexion.',
    }
  }
}

// Update du globalUser avec photo et nickname
export const addDisplayNameAndPhotoToUserProfile = async (displayName, photoURL) => {
  const currentUser = firebaseClient.auth.currentUser
  if (!currentUser) {
    return {
      success: false,
      error: 'Aucun utilisateur connecte.',
    }
  }

  try {
    await firebaseClient.updateProfile(currentUser, { displayName, photoURL })
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error?.message || 'Erreur pendant la mise a jour du profil.',
    }
  }
}

// Déconnexion
export const signOutUser = () => {
  return firebaseClient.signOut(firebaseClient.auth)
}
