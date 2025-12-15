import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  tr: {
    translation: {
      search: "Ara...",
      login_register: "Üye Girişi / Kayıt",
      logout: "Çıkış",
      tabs: {
        crypto: "Kripto Piyasası",
        bist: "BIST 100",
        forex: "Döviz",
        commodity: "Emtia",
        us_stock: "ABD Borsası",
        favorites: "Favorilerim",
        alarms: "Alarmlarım",
        portfolio: "Varlıklarım"
      },
      table: {
        instrument: "Enstrüman",
        price: "Fiyat",
        change: "24s",
        market_cap: "Piyasa Değ."
      },
      auth: {
        login_title: "Giriş Yap",
        register_title: "Kayıt Ol",
        username: "Kullanıcı Adı",
        password: "Şifre",
        email: "E-posta",
        phone: "Telefon (5xxxxxxxxx)",
        birth_date: "Doğum Tarihi",
        gender: "Cinsiyet",
        gender_select: "Seçiniz",
        male: "Erkek",
        female: "Kadın",
        submit_login: "GİRİŞ YAP",
        submit_register: "KAYIT OL",
        processing: "İşleniyor...",
        no_account: "Hesabın yok mu? Kayıt Ol.",
        have_account: "Zaten hesabın var mı? Giriş Yap.",
        guest_support: "Giriş Yapamıyorum / Destek",
        footer: "CryptoLive Yönetim Sistemi © 2025",
        login_success: "Giriş başarılı! Hoş geldiniz.",
        logout_success: "Başarıyla çıkış yapıldı.",
      },
      notifications_panel: {
        title: "Bildirimler",
        clear: "Temizle",
        empty: "Hiç bildirim yok.",
        you: "Siz",
        team: "CryptoLive Ekibi"
      },
      alarms_table: {
        title: "Aktif Alarmlar",
        coin: "Coin",
        target: "Hedef",
        current: "Şu An",
        condition: "Koşul",
        action: "İşlem",
        rise: "Yükseliş",
        fall: "Düşüş"
      },
      alarm_modal: {
        title_create: "Yeni Alarm Kur",
        title_edit: "Alarmı Düzenle",
        target_price: "Hedef Fiyat",
        current_price: "Güncel",
        note_placeholder: "Notun (Opsiyonel)",
        condition_rise: "Fiyat YÜKSELİRSE",
        condition_fall: "Fiyat DÜŞERSE",
        condition_rise_desc: "(Hedef ≥ Güncel)",
        condition_fall_desc: "(Hedef ≤ Güncel)",
        btn_cancel: "İptal",
        btn_create: "KUR",
        btn_update: "GÜNCELLE"
      },
      notifications: {
        alarm_created: "Alarm başarıyla kuruldu!",
        alarm_updated: "Alarm güncellendi!",
        alarm_deleted: "Alarm silindi.",
        process_failed: "İşlem başarısız."
      },
      support: {
        title_login: "Giriş Sorunu",
        title_register: "Üyelik Sorunu",
        title_general: "Bize Ulaşın",
        name_placeholder: "Adınız (Opsiyonel)",
        contact_placeholder: "E-posta veya Tel",
        msg_placeholder: "Sorununuzu kısaca yazın...",
        option_register: "Üye Olamıyorum",
        option_login: "Giriş Sorunu",
        option_forgot: "Şifremi Unuttum",
        option_other: "Diğer",
        type_suggestion: "Öneri",
        type_complaint: "Şikayet",
        type_technical: "Teknik Sorun",
        send: "Gönder",
        close: "Kapat",
        success: "Mesaj başarıyla gönderildi!", // DÜZELTİLDİ
        reply_title: "Destek Yanıtı"
      },
      assets: {
        'THYAO.IS': "Türk Hava Yolları",
        'AKBNK.IS': "Akbank",
        'VAKBN.IS': "Vakıfbank",
        'TCELL.IS': "Turkcell",
        'TTKOM.IS': "Türk Telekom",
        'KCHOL.IS': "Koç Holding",
        'SISE.IS': "Şişecam",
        'BIMAS.IS': "BİM",
        'GC=F': "Altın (Ons)",
        'CL=F': "Ham Petrol",
        'BZ=F': "Brent Petrol",
        'SI=F': "Gümüş",
        'HG=F': "Bakır",
        'NG=F': "Doğal Gaz",
        'GRAM-ALTIN': "Gram Altın",
        'CEYREK-ALTIN': "Çeyrek Altın",
        'TAM-ALTIN': "Tam Altın",
        'GRAM-GUMUS': "Gram Gümüş"
      },
      profile: {
        title: "Profil Ayarları",
        personal_info: "Kişisel Bilgilerim",
        contact_info: "İletişim Bilgilerim",
        delete_account: "Hesabımı Sil",
        delete_warning: "Hesabınızı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
        help_support: "Yardım ve Destek",
        username: "Kullanıcı Adı",
        username_placeholder: "Yeni kullanıcı adı",
        gender: "Cinsiyet",
        birth_date: "Doğum Tarihi",
        new_password: "Yeni Şifre",
        new_password_placeholder: "Yeni şifrenizi girin",
        current_password: "Mevcut Şifre",
        email: "E-posta Adresi",
        phone: "Telefon Numarası",
        send_verify_code: "Doğrulama Kodu Gönder",
        send: "Gönder",
        subject: "Konu",
        message: "Mesaj"
      },
      modal: {
        security_check: "Güvenlik Kontrolü",
        verify_text: "adresine gönderilen 6 haneli kodu giriniz.",
        confirm: "ONAYLA",
        cancel: "İptal"
      }
    }
  },
  en: {
    translation: {
      search: "Search...",
      login_register: "Sign In / Sign Up",
      logout: "Logout",
      tabs: {
        crypto: "Crypto Market",
        bist: "BIST 100",
        forex: "Forex",
        commodity: "Commodities",
        us_stock: "US Stocks",
        favorites: "My Favorites",
        alarms: "My Alarms",
        portfolio: "Portfolio"
      },
      table: {
        instrument: "Instrument",
        price: "Price",
        change: "24h",
        market_cap: "Mkt Cap"
      },
      auth: {
        login_title: "Sign In",
        register_title: "Sign Up",
        username: "Username",
        password: "Password",
        email: "Email",
        phone: "Phone (5xxxxxxxxx)",
        birth_date: "Birth Date",
        gender: "Gender",
        gender_select: "Select",
        male: "Male",
        female: "Female",
        submit_login: "SIGN IN",
        submit_register: "SIGN UP",
        processing: "Processing...",
        no_account: "Doesn't have an account? Sign Up.",
        have_account: "Already have an account? Sign In.",
        guest_support: "Can't Login / Support",
        footer: "CryptoLive Management System © 2025",
        login_success: "Login Successful! Welcome.",
        logout_success: "Logged out successfully."
      },
      notifications_panel: {
        title: "Notifications",
        clear: "Clear",
        empty: "No notifications yet.",
        you: "You",
        team: "CryptoLive Team"
      },
      alarms_table: {
        title: "Active Alarms",
        coin: "Coin",
        target: "Target",
        current: "Current",
        condition: "Condition",
        action: "Action",
        rise: "Rise",
        fall: "Fall"
      },
      alarm_modal: {
        title_create: "Create New Alarm",
        title_edit: "Edit Alarm",
        target_price: "Target Price",
        current_price: "Current",
        note_placeholder: "Note (Optional)",
        condition_rise: "If Price RISES",
        condition_fall: "If Price FALLS",
        condition_rise_desc: "(Target ≥ Current)",
        condition_fall_desc: "(Target ≤ Current)",
        btn_cancel: "Cancel",
        btn_create: "CREATE",
        btn_update: "UPDATE"
      },
      notifications: {
        alarm_created: "Alarm set successfully!",
        alarm_updated: "Alarm updated successfully!",
        alarm_deleted: "Alarm deleted.",
        process_failed: "Operation failed."
      },
      support: {
        title_login: "Login Issue",
        title_register: "Registration Issue",
        title_general: "Contact Us",
        name_placeholder: "Name (Optional)",
        contact_placeholder: "Email or Phone",
        msg_placeholder: "Describe your issue...",
        option_register: "Can't Register",
        option_login: "Login Problem",
        option_forgot: "Forgot Password",
        option_other: "Other",
        type_suggestion: "Suggestion",
        type_complaint: "Complaint",
        type_technical: "Technical Issue",
        send: "Send",
        close: "Close",
        success: "Message sent successfully!", // DÜZELTİLDİ
        reply_title: "Support Reply"
      },
      assets: {
        'THYAO.IS': "Turkish Airlines",
        'AKBNK.IS': "Akbank",
        'VAKBN.IS': "Vakifbank",
        'TCELL.IS': "Turkcell",
        'TTKOM.IS': "Turk Telekom",
        'KCHOL.IS': "Koc Holding",
        'SISE.IS': "Sisecam",
        'BIMAS.IS': "BIM Stores",
        'GC=F': "Gold (Ounce)",
        'CL=F': "Crude Oil",
        'BZ=F': "Brent Oil",
        'SI=F': "Silver",
        'HG=F': "Copper",
        'NG=F': "Natural Gas",
        'GRAM-ALTIN': "Gram Gold",
        'CEYREK-ALTIN': "Quarter Gold",
        'TAM-ALTIN': "Full Gold",
        'GRAM-GUMUS': "Gram Silver"
      },
      profile: {
        title: "Profile Settings",
        personal_info: "Personal Info",
        contact_info: "Contact Info",
        delete_account: "Delete Account",
        delete_warning: "Are you sure you want to delete your account? This action cannot be undone.",
        help_support: "Help & Support",
        username: "Username",
        username_placeholder: "New username",
        gender: "Gender",
        birth_date: "Birth Date",
        new_password: "New Password",
        new_password_placeholder: "Enter new password",
        current_password: "Current Password",
        email: "Email Address",
        phone: "Phone Number",
        send_verify_code: "Send Verify Email Code",
        send: "Send",
        subject: "Subject",
        message: "Message"
      },
      modal: {
        security_check: "Security Check",
        verify_text: "Enter the 6-digit code sent to",
        confirm: "CONFIRM",
        cancel: "Cancel"
      },
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "tr", 
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;