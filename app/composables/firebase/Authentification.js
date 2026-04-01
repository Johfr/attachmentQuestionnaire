import { firebaseFunctions } from "~/composables/firebase/init.js"


// Créer un user avec email & mdp
export const createUserAccountWithEmailAndPassword = async (email, password) => {
  try {
    const userCredential = await firebaseFunctions.createUserWithEmailAndPassword(firebaseFunctions.auth, email, password)
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
    const userCredential = await firebaseFunctions.signInWithEmailAndPassword(firebaseFunctions.auth, email, password)
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
  const currentUser = firebaseFunctions.auth.currentUser
  if (!currentUser) {
    return {
      success: false,
      error: 'Aucun utilisateur connecte.',
    }
  }

  try {
    await firebaseFunctions.updateProfile(currentUser, { displayName, photoURL })
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
  return firebaseFunctions.signOut(firebaseFunctions.auth)
}