// Attendre que le document soit chargé
document.addEventListener('DOMContentLoaded', function () {
    const audioBtn = document.querySelector('.audio-enable-btn');
    if (sessionStorage.getItem('audioActive') === 'true' && audioBtn) {
        audioBtn.innerHTML = '<i class="fas fa-check"></i> تم تفعيل الصوت';
        audioBtn.style.background = '#27ae60';
        audioBtn.disabled = true;
    }
    // Animation des éléments au défilement
    const animatedElements = document.querySelectorAll('.feature-card, .prayer-card, .prayer-detail-card');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = 1;
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    animatedElements.forEach(element => {
        element.style.opacity = 0;
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(element);
    });

    // Gestionnaire pour le formulaire de paramètres
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', function (e) {
            e.preventDefault();
            alert('تم حفظ الإعدادات بنجاح');
        });
    }

    // Initialiser la boussole Qibla si on est sur la page concernée
    if (document.getElementById('compass')) {
        initQiblaCompass();
    }

    // Charger les rappels si on est sur la page concernée
    if (document.getElementById('reminders-container')) {
        loadReminders();
    }

    // Charger les paramètres si on est sur la page concernée
    if (document.getElementById('settings-form')) {
        loadSettings();
    }

    // Animation des cartes de prière sur la page d'accueil
    const prayerCards = document.querySelectorAll('.prayer-card');
    if (prayerCards.length > 0) {
        setInterval(() => {
            const activeCard = document.querySelector('.prayer-card.active');
            if (activeCard) {
                activeCard.classList.remove('active');
                const nextCard = activeCard.nextElementSibling || prayerCards[0];
                nextCard.classList.add('active');
            }
        }, 5000);
    }


    // Charger les horaires de prière
    if (document.getElementById('prayer-times-container')) {
        loadPrayerTimes();
    }



    // Charger les horaires de prière sur la page d'accueil
    if (document.getElementById('home-prayer-times')) {
        loadHomePrayerTimes();
        // Mettre à jour le temps restant toutes les minutes
        setInterval(updateRemainingTime, 60000);
    }
});

// Variables globales pour les notifications
let notificationPermission = false;
let currentPrayerTimings = null;

// Démarrer la surveillance des heures de prière
function startPrayerNotifications() {
    // Effacer les anciens intervals
    prayerIntervals.forEach(interval => clearInterval(interval));
    prayerIntervals = [];

    // Obtenir les horaires de prière actuels
    getCurrentPrayerTimes().then(timings => {
        if (timings) {
            setupPrayerAlerts(timings);
        }
    });

    // Vérifier toutes les minutes
    const mainInterval = setInterval(() => {
        checkPrayerTime();
    }, 60000); // Vérifier chaque minute

    prayerIntervals.push(mainInterval);
}

// Obtenir les horaires de prière actuels
function getCurrentPrayerTimes() {
    return new Promise((resolve) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    fetch(`/api/prayer-times?lat=${position.coords.latitude}&lng=${position.coords.longitude}`)
                        .then(response => response.json())
                        .then(data => {
                            if (data && data.success) {
                                resolve(data.timings);
                            } else {
                                resolve(null);
                            }
                        })
                        .catch(() => resolve(null));
                },
                error => {
                    // Position par défaut (Alger)
                    fetch('/api/prayer-times?lat=36.8065&lng=3.0528')
                        .then(response => response.json())
                        .then(data => {
                            if (data && data.success) {
                                resolve(data.timings);
                            } else {
                                resolve(null);
                            }
                        })
                        .catch(() => resolve(null));
                }
            );
        } else {
            // Géolocalisation non supportée, utiliser la position par défaut
            fetch('/api/prayer-times?lat=36.8065&lng=3.0528')
                .then(response => response.json())
                .then(data => {
                    if (data && data.success) {
                        resolve(data.timings);
                    } else {
                        resolve(null);
                    }
                })
                .catch(() => resolve(null));
        }
    });
}

// Configurer les alertes pour chaque prière
function setupPrayerAlerts(timings) {
    const prayers = [
        { key: 'Fajr', name: 'الفجر' },
        { key: 'Dhuhr', name: 'الظهر' },
        { key: 'Asr', name: 'العصر' },
        { key: 'Maghrib', name: 'المغرب' },
        { key: 'Isha', name: 'العشاء' }
    ];

    prayers.forEach(prayer => {
        const prayerTime = timings[prayer.key];
        if (prayerTime) {
            schedulePrayerNotification(prayer.name, prayerTime);
        }
    });
}

// Fonction pour charger les horaires de prière
function loadPrayerTimes() {
    // Afficher le statut de chargement
    const container = document.getElementById('prayer-times-container');
    if (container) {
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>جاري تحميل أوقات الصلاة...</p>
            </div>
        `;
    }

    // Essayer d'obtenir la position de l'utilisateur
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Mettre à jour le texte de localisation
                const locationText = document.getElementById('location-text');
                if (locationText) {
                    locationText.innerHTML = `<i class="fas fa-location-dot"></i> موقعك الحالي: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                }

                fetchPrayerTimesForDisplay(lat, lng);
            },
            function (error) {
                // Utiliser la position par défaut (Alger) en cas d'erreur
                const locationText = document.getElementById('location-text');
                if (locationText) {
                    locationText.innerHTML = `<i class="fas fa-location-dot"></i> الموقع الافتراضي: الجزائر العاصمة`;
                }

                fetchPrayerTimesForDisplay(36.8065, 3.0528);
            }
        );
    } else {
        // Géolocalisation non supportée
        const locationText = document.getElementById('location-text');
        if (locationText) {
            locationText.innerHTML = `<i class="fas fa-location-dot"></i> الموقع الافتراضي: الجزائر العاصمة`;
        }

        fetchPrayerTimesForDisplay(36.8065, 3.0528);
    }
}

// Fonction utilitaire pour récupérer les horaires de prière
function fetchPrayerTimesForDisplay(lat, lng) {
    fetch(`/api/prayer-times?lat=${lat}&lng=${lng}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.success) {
                displayPrayerTimes(data);
            } else {
                displayError('لم يتم العثور على أوقات الصلاة');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            displayError('حدث خطأ أثناء جلب البيانات');
        });
}

// Afficher les horaires de prière
function displayPrayerTimes(data) {
    const container = document.getElementById('prayer-times-container');
    const dateElement = document.getElementById('prayer-date');
    const hijriElement = document.getElementById('hijri-date');

    if (dateElement) dateElement.textContent = `التاريخ الميلادي: ${data.date}`;
    if (hijriElement) hijriElement.textContent = `التاريخ الهجري: ${data.hijri}`;

    let html = '';
    const prayers = [
        { name: 'الفجر', key: 'Fajr' },
        { name: 'الشروق', key: 'Sunrise' },
        { name: 'الظهر', key: 'Dhuhr' },
        { name: 'العصر', key: 'Asr' },
        { name: 'المغرب', key: 'Maghrib' },
        { name: 'العشاء', key: 'Isha' }
    ];

    prayers.forEach(prayer => {
        html += `
            <div class="prayer-detail-card">
                <div class="prayer-detail-info">
                    <h3 class="prayer-detail-name">${prayer.name}</h3>
                    <div class="prayer-detail-time">${data.timings[prayer.key]}</div>
                </div>
                <div class="prayer-detail-action">
                    <button class="btn" onclick="setReminder('${prayer.key}', '${data.timings[prayer.key]}')">تذكير</button>
                </div>
            </div>
        `;
    });

    if (container) container.innerHTML = html;
}

// Afficher une erreur
function displayError(message) {
    const container = document.getElementById('prayer-times-container');
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
            </div>
        `;
    }
}

// Fonction pour charger les horaires de prière sur la page d'accueil
function loadHomePrayerTimes() {
    const container = document.getElementById('home-prayer-times');
    if (!container) return;

    container.innerHTML = `
        <div class="loading-prayers">
            <i class="fas fa-spinner"></i>
            <p>جاري تحميل أوقات الصلاة...</p>
        </div>
    `;

    function fetchPrayersDirect(lat, lng) {
        // Date du jour au format DD-MM-YYYY
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const date = `${day}-${month}-${year}`;

        // Appel direct à Aladhan — sans passer par Flask
        fetch(`https://api.aladhan.com/v1/timings/${date}?latitude=${lat}&longitude=${lng}&method=2`)
            .then(r => r.json())
            .then(data => {
                if (data.code !== 200) { showHomeError('خطأ في تحميل البيانات'); return; }

                const timings = data.data.timings;
                const prayerNames = {
                    Fajr: 'الفجر', Dhuhr: 'الظهر',
                    Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء'
                };
                const order = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

                // Trouver la prochaine prière
                const nowMs = now.getHours() * 3600000 + now.getMinutes() * 60000;

                function timeToMs(str) {
                    const [h, m] = str.split(':').map(Number);
                    return (h * 60 + m) * 60000;
                }

                let nextPrayer = null;
                let minDiff = Infinity;
                order.forEach(k => {
                    const ms = timeToMs(timings[k]);
                    const diff = ms > nowMs ? ms - nowMs : ms + 86400000 - nowMs;
                    if (diff < minDiff) { minDiff = diff; nextPrayer = k; }
                });

                // Sauvegarder pour les countdowns
                currentPrayerTimings = {};
                order.forEach(k => { currentPrayerTimings[k] = timings[k]; });

                container.innerHTML = '';

                order.forEach(prayer => {
                    const card = document.createElement('div');
                    const isNext = prayer === nextPrayer;
                    const prayerMs = timeToMs(timings[prayer]);
                    const diffMs = prayerMs - nowMs;

                    let remainText = '';
                    if (diffMs <= 0) {
                        remainText = 'تمت الصلاة';
                    } else {
                        const diffMin = Math.floor(diffMs / 60000);
                        remainText = formatTimeInArabic(diffMin);
                    }

                    card.className = `prayer-card${isNext ? ' active' : ''}`;
                    card.setAttribute('data-prayer', prayer);
                    card.innerHTML = `
                        <h3 class="prayer-name">${prayerNames[prayer]}</h3>
                        <div class="prayer-time">${timings[prayer]}</div>
                        <p class="remaining-time">${remainText}</p>
                    `;
                    container.appendChild(card);
                });
            })
            .catch(() => showHomeError('تعذّر الاتصال بالخادم'));
    }

    // Géolocalisation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => fetchPrayersDirect(
                pos.coords.latitude,
                pos.coords.longitude
            ),
            () => fetchPrayersDirect(36.8065, 3.0528)
        );
    } else {
        fetchPrayersDirect(36.8065, 3.0528);
    }
}
// Récupérer les horaires de prière depuis l'API pour la page d'accueil
function fetchHomePrayerTimes(lat, lng) {
    fetch(`/api/prayer-times?lat=${lat}&lng=${lng}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.success) {
                // Sauvegarder les horaires globalement pour la mise à jour en temps réel
                currentPrayerTimings = data.timings;
                displayHomePrayerTimes(data.timings, data.date, data.hijri);
            } else {
                showHomeError('تعذر تحميل أوقات الصلاة');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showHomeError('خطأ في الاتصال بالخادم');
        });
}

// Convertir l'heure (format HH:MM AM/PM) en millisecondes depuis minuit
function convertTimeToMilliseconds(timeStr) {
    const [time, modifier] = timeStr.trim().split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    // Convertir en format 24h
    if (modifier && modifier.toUpperCase() === 'PM' && hours !== 12) {
        hours += 12;
    } else if (modifier && modifier.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
    }

    return (hours * 60 * 60 + minutes * 60) * 1000;
}

// Obtenir les millisecondes depuis minuit pour l'heure actuelle
function getCurrentTimeInMilliseconds() {
    const now = new Date();
    return (now.getHours() * 60 * 60 + now.getMinutes() * 60 + now.getSeconds()) * 1000;
}

// Formater le temps en arabe correct
function formatTimeInArabic(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    function formatHours(n) {
        if (n === 0) return '';
        if (n === 1) return 'ساعة واحدة';
        if (n === 2) return 'ساعتان';
        if (n >= 3 && n <= 10) return `${n} ساعات`;
        return `${n} ساعة`;
    }

    function formatMinutes(n) {
        if (n === 0) return '';
        if (n === 1) return 'دقيقة واحدة';
        if (n === 2) return 'دقيقتان';
        if (n >= 3 && n <= 10) return `${n} دقائق`;
        return `${n} دقيقة`;
    }

    const hoursStr = formatHours(h);
    const minsStr = formatMinutes(m);

    if (h > 0 && m > 0) return `متبقٍّ ${hoursStr} و ${minsStr}`;
    if (h > 0) return `متبقٍّ ${hoursStr}`;
    if (m > 0) return `متبقٍّ ${minsStr}`;
    return 'أقل من دقيقة';
}

// Afficher les horaires de prière sur la page d'accueil
function displayHomePrayerTimes(timings, date, hijriDate) {
    const container = document.getElementById('home-prayer-times');
    const dateElement = document.getElementById('home-date');
    const hijriElement = document.getElementById('home-hijri-date');

    if (dateElement) dateElement.textContent = `التاريخ: ${date}`;
    if (hijriElement) hijriElement.textContent = `هجري: ${hijriDate}`;

    // Vider le conteneur
    container.innerHTML = '';

    // Mapping des noms de prières en arabe
    const prayerNames = {
        'Fajr': 'الفجر',
        'Sunrise': 'الشروق',
        'Dhuhr': 'الظهر',
        'Asr': 'العصر',
        'Maghrib': 'المغرب',
        'Isha': 'العشاء'
    };

    // Ordre d'affichage des prières (sans Sunrise pour les calculs de temps restant)
    const prayerOrder = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const displayOrder = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

    // Obtenir l'heure actuelle en millisecondes depuis minuit
    const currentTimeMs = getCurrentTimeInMilliseconds();

    // Trouver la prochaine prière
    let nextPrayer = null;
    let minDiff = Infinity;
    prayerOrder.forEach(prayer => {
        const prayerTimeMs = convertTimeToMilliseconds(timings[prayer]);
        const diff = prayerTimeMs - currentTimeMs;

        // Ignorer les prières déjà passées pour aujourd'hui
        if (diff <= 0) return;

        if (diff < minDiff) {
            minDiff = diff;
            nextPrayer = prayer;
        }
    });

    // Créer les cartes pour chaque prière
    displayOrder.forEach(prayer => {
        const card = document.createElement('div');
        card.className = 'prayer-card';
        card.dataset.prayer = prayer; // Pour identifier la carte lors de la mise à jour

        // Marquer la prière active
        if (prayer === nextPrayer) {
            card.classList.add('active');
        }

        // Calculer le temps restant

        let remainingText = '';
        if (prayerOrder.includes(prayer)) {
            const prayerTimeMs = convertTimeToMilliseconds(timings[prayer]);
            const diffMs = prayerTimeMs - currentTimeMs;

            if (diffMs <= 0) {
                remainingText = 'تمت الصلاة';
            } else {
                const diffMinutes = Math.floor(diffMs / (60 * 1000));
                remainingText = `متبقي ${formatTimeInArabic(diffMinutes)}`;
            }
        } else {
            // Pour الشروق
            remainingText = 'وقت انتهاء صلاة الفجر';
        }

        card.innerHTML = `
            <h3 class="prayer-name">${prayerNames[prayer]}</h3>
            <div class="prayer-time">${timings[prayer]}</div>
            <p class="remaining-time">${remainingText}</p>
        `;

        container.appendChild(card);
    });
}

// Mettre à jour le temps restant en temps réel
function updateRemainingTime() {
    if (!currentPrayerTimings) return;

    const container = document.getElementById('home-prayer-times');
    if (!container) return;

    const prayerOrder = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const currentTimeMs = getCurrentTimeInMilliseconds();

    // Trouver la prochaine prière
    let nextPrayer = null;
    let minDiff = Infinity;

    prayerOrder.forEach(prayer => {
        const prayerTimeMs = convertTimeToMilliseconds(currentPrayerTimings[prayer]);
        let diff = prayerTimeMs - currentTimeMs;

        if (diff <= 0) {
            diff = (24 * 60 * 60 * 1000) + diff;
        }

        if (diff < minDiff) {
            minDiff = diff;
            nextPrayer = prayer;
        }
    });

    // Mettre à jour les cartes
    prayerOrder.forEach(prayer => {
        const card = container.querySelector(`[data-prayer="${prayer}"]`);
        if (!card) return;

        const remainingElement = card.querySelector('.remaining-time');
        if (!remainingElement) return;

        // Enlever/ajouter la classe active
        if (prayer === nextPrayer) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }

        // Calculer le nouveau temps restant
        const prayerTimeMs = convertTimeToMilliseconds(currentPrayerTimings[prayer]);
        const diffMs = prayerTimeMs - currentTimeMs;

        if (diffMs <= 0) {
            remainingElement.textContent = 'تمت الصلاة';
        } else {
            const diffMinutes = Math.floor(diffMs / (60 * 1000));
            remainingElement.textContent = `متبقي ${formatTimeInArabic(diffMinutes)}`;
        }
    });
}

// Convertir l'heure (format HH:MM) en minutes (fonction de compatibilité)
function convertTimeToMinutes(timeStr) {
    const [time, modifier] = timeStr.trim().split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (modifier && modifier.toUpperCase() === 'PM' && hours !== 12) {
        hours += 12;
    } else if (modifier && modifier.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
    }

    return hours * 60 + minutes;
}

// Afficher une erreur sur la page d'accueil
function showHomeError(message) {
    const container = document.getElementById('home-prayer-times');
    container.innerHTML = `
        <div class="prayer-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
        </div>
    `;
}

// Initialiser la boussole Qibla
function initQiblaCompass() {
    if (!window.DeviceOrientationEvent) {
        document.getElementById('compass-error').style.display = 'block';
        return;
    }

    // Demander l'autorisation pour l'orientation sur iOS
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', compassHandler);
                } else {
                    document.getElementById('compass-error').style.display = 'block';
                }
            })
            .catch(console.error);
    } else {
        window.addEventListener('deviceorientation', compassHandler);
    }

    // Obtenir la direction de la Qibla
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                fetch(`/api/qibla-direction?lat=${lat}&lng=${lng}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data && data.success) {
                            window.qiblaDirection = data.direction;
                            document.getElementById('qibla-direction').textContent =
                                `اتجاه القبلة: ${Math.round(data.direction)}°`;
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                    });
            },
            function (error) {
                // Utiliser la position par défaut en cas d'erreur
                fetch('/api/qibla-direction?lat=36.8065&lng=3.0528')
                    .then(response => response.json())
                    .then(data => {
                        if (data && data.success) {
                            window.qiblaDirection = data.direction;
                            document.getElementById('qibla-direction').textContent =
                                `اتجاه القبلة: ${Math.round(data.direction)}°`;
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                    });
            }
        );
    }
}

// Gérer les données de la boussole
function compassHandler(event) {
    const compass = document.getElementById('compass-needle');
    const direction = event.alpha; // Direction en degrés (0-360)

    if (compass && direction !== null) {
        // Ajuster la rotation en fonction de l'orientation du téléphone
        let rotation = 360 - direction;

        // Ajuster en fonction de la direction de la Qibla si disponible
        if (window.qiblaDirection) {
            rotation += window.qiblaDirection;
        }

        compass.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
    }
}

// Fonction pour définir un rappel (à implémenter)
function setReminder(prayerKey, prayerTime) {
    alert(`سيتم تذكيرك بصلاة ${getPrayerName(prayerKey)} على الساعة ${prayerTime}`);
    // Implémenter la logique de rappel ici
}

// الحصول على اسم الصلاة بالعربية
function getPrayerName(prayerKey) {
    const prayers = {
        'Fajr': 'الفجر',
        'Dhuhr': 'الظهر',
        'Asr': 'العصر',
        'Maghrib': 'المغرب',
        'Isha': 'العشاء',
        'Sunrise': 'الشروق'
    };

    return prayers[prayerKey] || prayerKey;
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}



// ════════════════════════════════════════════════════════
// DHIKR NOTIFICATION SYSTEM — أذكار الله تعالى
// ════════════════════════════════════════════════════════

const DHIKR_LIST = [
    {
        type: 'استغفار',
        icon: 'fas fa-cloud-rain',
        arabic: 'أَسْتَغْفِرُ اللهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
        virtue: '« منْ لَزِم الاسْتِغْفَار، جَعَلَ اللَّه لَهُ مِنْ كُلِّ ضِيقٍ مخْرجًا، ومنْ كُلِّ هَمٍّ فَرجًا، وَرَزَقَهُ مِنْ حيْثُ لاَ يَحْتَسِبُ » — رواه أبو داود',
    },
    {
        type: 'تسبيح',
        icon: 'fas fa-star',
        arabic: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ سُبْحَانَ اللهِ الْعَظِيمِ',
        virtue: '« كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ، ثَقِيلَتَانِ فِي الْمِيزَانِ، حَبِيبَتَانِ إِلَى الرَّحْمَنِ » — متفق عليه',

    },
    {
        type: 'تهليل',
        icon: 'fas fa-moon',
        arabic: 'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        virtue: '« مَنْ قَالَهَا مِئَةَ مَرَّةٍ فِي يَوْمٍ كَانَتْ لَهُ عَدْلَ عَشْرِ رِقَابٍ » — متفق عليه',

    },
    {
        type: 'صلاة على النبي',
        icon: 'fas fa-sun',
        arabic: 'اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِهِ وَصَحْبِهِ أَجْمَعِينَ',
        virtue: '« مَنْ صَلَّى عَلَيَّ صَلَاةً وَاحِدَةً صَلَّى اللهُ عَلَيْهِ عَشْراً » — رواه مسلم',

    },
    {
        type: 'حوقلة',
        icon: 'fas fa-infinity',
        arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ الْعَلِيِّ الْعَظِيمِ',
        virtue: '« هِيَ كَنْزٌ مِنْ كُنُوزِ الْجَنَّةِ » — متفق عليه',

    },
    {
        type: 'تكبير',
        icon: 'fas fa-mosque',
        arabic: 'اللهُ أَكْبَرُ كَبِيراً، وَالْحَمْدُ للهِ كَثِيراً، وَسُبْحَانَ اللهِ بُكْرَةً وَأَصِيلاً',

    },
    {
        type: 'دعاء',
        icon: 'fas fa-hands',
        arabic: 'رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ',
        virtue: '« الدُّعَاءُ هُوَ الْعِبَادَةُ » —  خلاصة حكم المحدث : [إسناده صحيح أو حسن أو ما قاربهما]',

    },
    {
        type: 'تحميد',
        icon: 'fas fa-heart',
        arabic: 'الْحَمْدُ للهِ حَمْداً كَثِيراً طَيِّباً مُبَارَكاً',
        virtue: '« الْحَمْدُ للهِ تَمْلَأُ الْمِيزَانَ » — رواه مسلم',

    },
    {
        type: 'استغفار',
        icon: 'fas fa-cloud-rain',
        arabic: 'مَن جلسَ في مجلِسٍ فَكَثرَ فيهِ لغطُهُ ، فقالَ قبلَ أن يقومَ من مجلسِهِ ذلِكَ : سُبحانَكَ اللَّهمَّ وبحمدِكَ ، أشهدُ أن لا إلَهَ إلَّا أنتَ أستغفرُكَ وأتوبُ إليكَ ، إلَّا غُفِرَ لَهُ ما كانَ في مجلِسِهِ ذلِكَ',
        virtue: '« كَفَّارَةُ الْمَجْلِسِ — مَنْ قَالَهَا غُفِرَ لَهُ مَا كَانَ فِي مَجْلِسِهِ » — رواه الترمذي',

    },
    {
        type: 'تسبيح',
        icon: 'fas fa-star',
        arabic: 'سُبْحَانَ اللهِ وَالْحَمْدُ للهِ وَلَا إِلَهَ إِلَّا اللهُ وَاللهُ أَكْبَرُ',
        virtue: '« أَحَبُّ الْكَلَامِ إِلَى اللهِ أَرْبَعٌ: سُبْحَانَ اللهِ، وَالْحَمْدُ للهِ، وَلَا إِلَهَ إِلَّا اللهُ، وَاللهُ أَكْبَرُ » — رواه مسلم',

    },
    {
        type: 'حسبي الله',
        icon: 'fas fa-shield-halved',
        arabic: 'حَسْبُنَا اللهُ وَنِعْمَ الْوَكِيلُ',
        virtue: '« عَنِ ابنِ عَبَّاسٍ، قال: كان آخِرَ قَولِ إبراهيمَ حينَ أُلقيَ في النَّارِ: حَسبيَ اللهُ ونِعمَ الوكيلُ » — رواه البخاري',

    },
    {
        type: 'تهليل',
        icon: 'fas fa-moon',
        arabic: 'لَا إِلَهَ إِلَّا اللهُ',
        virtue: ' ما مِنْ عبدٍ قال: « لا إلهَ إلا الله، ثم مات على ذلك إلا دخَلَ الجنة » — رواه البخاري ',

    },
    {
        type: 'دعاء',
        icon: 'fas fa-hands',
        arabic: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ',
        virtue: 'من أعظم الأدعية التي تتضمن تحقيق العبودية لله رب العالمين',

    }
];

// ── State ──
let dhikrIndex = parseInt(sessionStorage.getItem('dhikrIndex') || '0');
let dhikrTimer = null;
let dhikrAutoClose = null;

// ── Créer l'élément DOM ──
function createDhikrNotif() {
    if (document.getElementById('dhikr-notif')) return;
    const el = document.createElement('div');
    el.id = 'dhikr-notif';
    el.innerHTML = `
        <div class="dhikr-notif-card" onclick="closeDhikrNotif()" style="cursor:pointer;">
            <div class="dhikr-progress-bar">
                <div class="dhikr-progress-fill" id="dhikr-progress"></div>
            </div>
            <div class="dhikr-notif-body">
                <div class="dhikr-watermark">الله</div>
                <div class="dhikr-notif-header">
                    <span class="dhikr-type-badge">
                        <i id="dhikr-icon"></i>
                        <span id="dhikr-type-label"></span>
                    </span>
                    <span style="font-size:.72rem;color:rgba(200,160,80,.45);font-family:'Tajawal',sans-serif;">اضغط للإغلاق</span>
                </div>
                <div class="dhikr-notif-arabic" id="dhikr-arabic"></div>
                <div class="dhikr-notif-virtue" id="dhikr-virtue"></div>
            </div>
        </div>
    `;
    document.body.appendChild(el);
}

// ── Afficher un dhikr ──
function showDhikrNotif() {
    createDhikrNotif();

    const d = DHIKR_LIST[dhikrIndex];
    const el = document.getElementById('dhikr-notif');
    const num = DHIKR_LIST.length;

    // Remplir le contenu
    document.getElementById('dhikr-icon').className = d.icon;
    document.getElementById('dhikr-type-label').textContent = d.type;
    document.getElementById('dhikr-arabic').textContent = d.arabic;
    document.getElementById('dhikr-virtue').textContent = d.virtue;

    // Réinitialiser la barre de progression
    const bar = document.getElementById('dhikr-progress');
    bar.style.animation = 'none';
    bar.offsetHeight; // reflow
    bar.style.animation = 'dhikr-shrink 8s linear forwards';

    // Afficher
    el.classList.add('show');

    // Passer au suivant auto après 15s
    clearTimeout(dhikrAutoClose);
    dhikrAutoClose = setTimeout(() => {
        closeDhikrNotif();
    }, 15000);

    // Incrémenter l'index (boucle) + sauvegarder
    dhikrIndex = (dhikrIndex + 1) % num;
    sessionStorage.setItem('dhikrIndex', dhikrIndex);
}

// ── Fermer ──
function closeDhikrNotif() {
    const el = document.getElementById('dhikr-notif');
    if (el) el.classList.remove('show');
    clearTimeout(dhikrAutoClose);
}

// ── Passer au suivant manuellement ──
function showNextDhikr() {
    closeDhikrNotif();
    setTimeout(showDhikrNotif, 400);
}

// ── Chiffres arabes ──
function toArabicNotif(n) {
    return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

// ── Lancer le système toutes les 3 minutes ──
function startDhikrSystem() {
    // Pages autorisées uniquement
    const allowedPages = ['/', '/prayers', '/qibla'];
    const currentPage = window.location.pathname;

    if (!allowedPages.includes(currentPage)) return; // ← stoppe tout

    setTimeout(() => {
        showDhikrNotif();
        dhikrTimer = setInterval(showDhikrNotif, 3 * 60 * 1000);
    }, 30 * 1000);
}

// ── Démarrer ──
document.addEventListener('DOMContentLoaded', startDhikrSystem);