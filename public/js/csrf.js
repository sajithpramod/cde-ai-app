export let csrfToken = '';
export async function fetchCSRFToken() {
    try {
        const res = await fetch('/csrf-token', { credentials: 'include' });
        const data = await res.json();
        csrfToken = data.csrfToken;
        return csrfToken; 
       
    } catch (err) {
        console.error('CSRF token fetch failed:', err);
    }
}