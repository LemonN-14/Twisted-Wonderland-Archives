import { auth, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, db, doc, getDoc } from '../firebase.js';
import { showToast } from '../app.js';

export function initAuth() {
    const authBtn = document.getElementById('auth-btn');
    const authDropdown = document.getElementById('auth-dropdown');
    const btnLogout = document.getElementById('btn-logout');
    const authModal = document.getElementById('auth-modal');
    if (!authBtn || !authModal) return;

    let isLoggedIn = false;

    authBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isLoggedIn) {
            authDropdown.classList.toggle('show');
        } else {
            authModal.style.display = "block";
            forgotPwView.classList.remove('active');
            authTabsContainer.style.display = 'block';
            document.querySelector('#auth-tabs li[data-target="login-view"]').click();
        }
    });

    document.addEventListener('click', (e) => {
        if (isLoggedIn && authDropdown.classList.contains('show') && !authBtn.contains(e.target)) {
            authDropdown.classList.remove('show');
        }
    });

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            signOut(auth).then(() => {
                authDropdown.classList.remove('show');
                showToast("ออกจากระบบแล้ว");
            });
        });
    }

    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');
    const forgotPwView = document.getElementById('forgot-pw-view');
    const authTabsContainer = document.getElementById('auth-tabs-container');

    const showForgotPwBtn = document.getElementById('show-forgot-pw');
    const backToLoginBtn = document.getElementById('back-to-login');

    if (showForgotPwBtn) {
        showForgotPwBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginView.classList.remove('active');
            authTabsContainer.style.display = 'none';
            forgotPwView.classList.add('active');
        });
    }

    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', () => {
            forgotPwView.classList.remove('active');
            authTabsContainer.style.display = 'block';
            loginView.classList.add('active');
        });
    }

    const signupPass = document.getElementById('signup-password');
    const signupConf = document.getElementById('signup-confirm-password');
    const signupError = document.getElementById('signup-error');
    const signupPwError = document.getElementById('signup-pw-error');
    const signupSubmitBtn = document.getElementById('btn-signup-submit');

    const strictPasswordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,12}$/;

    const checkPasswordMatch = () => {
        let isValid = true;

        if (signupPass.value && !strictPasswordRegex.test(signupPass.value)) {
            signupPwError.style.display = 'block';
            isValid = false;
        } else {
            signupPwError.style.display = 'none';
        }

        if (signupConf.value && signupPass.value !== signupConf.value) {
            signupError.style.display = 'block';
            isValid = false;
        } else {
            signupError.style.display = 'none';
        }

        signupSubmitBtn.disabled = !isValid;
    };

    if(signupPass && signupConf) {
        signupPass.addEventListener('input', checkPasswordMatch);
        signupConf.addEventListener('input', checkPasswordMatch);
    }

    // Auth State Observer with Admin Check
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            isLoggedIn = true;
            authBtn.innerHTML = '<i class="fas fa-user-check" style="color:var(--accent-color);"></i>';
            authBtn.title = "บัญชีของฉัน";
            
            try {
                const adminDoc = await getDoc(doc(db, "settings", "admins"));
                if (adminDoc.exists()) {
                    const emailList = adminDoc.data().emailList || [];
                    if (emailList.includes(user.email)) {
                        document.body.classList.add('is-admin');
                    } else {
                        document.body.classList.remove('is-admin');
                    }
                }
            } catch (e) {
                console.error("Error checking admin status:", e);
            }
        } else {
            isLoggedIn = false;
            authBtn.innerHTML = '<i class="fas fa-user-circle"></i>';
            authBtn.title = "เข้าสู่ระบบ";
            authDropdown.classList.remove('show');
            document.body.classList.remove('is-admin');
        }
    });

    const googleProvider = new GoogleAuthProvider();
    const fbProvider = new FacebookAuthProvider();
    const appleProvider = new OAuthProvider('apple.com');

    document.getElementById('btn-google-login').onclick = () => {
        signInWithPopup(auth, googleProvider).then(() => {
            authModal.style.display = "none";
            showToast("เข้าสู่ระบบด้วย Google สำเร็จ");
        }).catch(e => showToast("เกิดข้อผิดพลาด: " + e.message));
    };

    document.getElementById('btn-facebook-login').onclick = () => {
        signInWithPopup(auth, fbProvider).then(() => {
            authModal.style.display = "none";
            showToast("เข้าสู่ระบบด้วย Facebook สำเร็จ");
        }).catch(e => showToast("เกิดข้อผิดพลาด: " + e.message));
    };

    document.getElementById('btn-apple-login').onclick = () => {
        signInWithPopup(auth, appleProvider).then(() => {
            authModal.style.display = "none";
            showToast("เข้าสู่ระบบด้วย Apple สำเร็จ");
        }).catch(e => showToast("เกิดข้อผิดพลาด: " + e.message));
    };

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            
            signInWithEmailAndPassword(auth, email, pass)
                .then(() => {
                    authModal.style.display = "none";
                    showToast("เข้าสู่ระบบสำเร็จ");
                    loginForm.reset();
                })
                .catch((error) => {
                    alert("เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลหรือรหัสผ่าน");
                });
        };
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.onsubmit = (e) => {
            e.preventDefault();
            if (!strictPasswordRegex.test(signupPass.value) || signupPass.value !== signupConf.value) return;

            const email = document.getElementById('signup-email').value;
            const pass = signupPass.value;

            createUserWithEmailAndPassword(auth, email, pass)
                .then(() => {
                    authModal.style.display = "none";
                    showToast("สมัครสมาชิกและเข้าสู่ระบบสำเร็จ");
                    signupForm.reset();
                })
                .catch((error) => {
                    if (error.code === 'auth/email-already-in-use') {
                        alert("อีเมลนี้มีผู้ใช้งานแล้ว");
                    } else {
                        alert("เกิดข้อผิดพลาด: " + error.message);
                    }
                });
        };
    }

    const forgotForm = document.getElementById('forgot-pw-form');
    if (forgotForm) {
        forgotForm.onsubmit = (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-email').value;
            
            sendPasswordResetEmail(auth, email)
                .then(() => {
                    alert("ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว");
                    forgotPwView.classList.remove('active');
                    authTabsContainer.style.display = 'block';
                    loginView.classList.add('active');
                    forgotForm.reset();
                })
                .catch((error) => {
                    alert("เกิดข้อผิดพลาด: " + error.message);
                });
        };
    }
}