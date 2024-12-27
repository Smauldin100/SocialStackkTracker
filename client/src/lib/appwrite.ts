import { Client, Account, Databases, Storage, Teams } from "appwrite";

// Initialize Appwrite client
const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

// Initialize Appwrite services
const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);
const teams = new Teams(client);

// Authentication helper functions
export const authService = {
    // Create email session
    createEmailSession: async (email: string, password: string) => {
        return await account.createEmailSession(email, password);
    },

    // Sign in with Google
    signInWithGoogle: async () => {
        return await account.createOAuth2Session(
            'google',
            `${window.location.origin}/dashboard`,
            `${window.location.origin}/auth`
        );
    },

    // Sign in with Facebook
    signInWithFacebook: async () => {
        return await account.createOAuth2Session(
            'facebook',
            `${window.location.origin}/dashboard`,
            `${window.location.origin}/auth`
        );
    },

    // Get current session
    getCurrentSession: async () => {
        try {
            return await account.get();
        } catch (error) {
            return null;
        }
    },

    // Delete current session
    deleteCurrentSession: async () => {
        try {
            return await account.deleteSession('current');
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }
};

export { client, account, databases, storage, teams };