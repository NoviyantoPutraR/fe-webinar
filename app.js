const GAS_URL = 'https://script.google.com/macros/s/AKfycbyuslul2wzQUGneiKkmJcDCdZoWxrMYzWoXjEUHPbGJmmF88PqFjkPl1H5-CJRcxNSVFA/exec';

const form = document.getElementById('form-daftar');
const pesan = document.getElementById('pesan');
const hiddenSelectKota = document.getElementById('kota'); // Renamed to avoid conflict
const submitBtn = document.getElementById('submit-btn');
const btnText = submitBtn.querySelector('.btn-text');

// Searchable dropdown elements
const kotaSearchInput = document.getElementById('kota-search');
const kotaDropdown = document.getElementById('kota-dropdown');
let allKotaData = [];
let selectedKotaIndex = -1;

/* ==========================
   UTILITY FUNCTIONS
========================== */
function showMessage(text, type) {
  pesan.textContent = text;
  pesan.className = `message show ${type}`;
  setTimeout(() => {
    pesan.classList.remove('show');
  }, 5000);
}

function setButtonLoading(loading) {
  if (loading) {
    submitBtn.disabled = true;
    btnText.textContent = 'Mengirim...';
  } else {
    submitBtn.disabled = false;
    btnText.textContent = 'Daftar';
  }
}

/* ==========================
   LOAD DATA KOTA
========================== */
fetch(`${GAS_URL}?aksi=ambilKota`)
  .then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  })
  .then(json => {
    if (!json.sukses) {
      throw new Error(json.pesan || 'Gagal memuat data kota');
    }

    // Validate data
    if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
      throw new Error('Data kota kosong atau tidak valid');
    }

    // Store all kota data
    allKotaData = json.data;
    
    // Populate hidden select for form submission
    hiddenSelectKota.innerHTML = '<option value="">Pilih Asal Daerah</option>';
    allKotaData.forEach(k => {
      if (k.id_kota && k.nama_kota) {
        const opt = document.createElement('option');
        opt.value = k.id_kota;
        opt.textContent = k.nama_kota;
        opt.dataset.nama = k.nama_kota;
        hiddenSelectKota.appendChild(opt);
      }
    });

    // Update placeholder
    kotaSearchInput.placeholder = 'Cari Asal Daerah...';
    kotaSearchInput.disabled = false;

    // Initialize searchable dropdown
    if (allKotaData.length > 0) {
      initKotaSearch();
    } else {
      throw new Error('Tidak ada data kota yang tersedia');
    }
  })
  .catch(err => {
    console.error('Error loading kota:', err);
    
    // Reset states
    hiddenSelectKota.innerHTML = '<option value="">Error memuat data</option>';
    hiddenSelectKota.disabled = true;
    kotaSearchInput.disabled = true;
    kotaSearchInput.placeholder = 'Error memuat data. Silakan refresh halaman.';
    kotaSearchInput.value = '';
    allKotaData = [];
    
    // Show error message
    const errorMsg = err.message || 'Gagal memuat daftar kota. Silakan refresh halaman.';
    showMessage(errorMsg, 'error');
  });

/* ==========================
   SEARCHABLE DROPDOWN - KOTA
========================== */
function initKotaSearch() {
  // Check if data is available
  if (!allKotaData || allKotaData.length === 0) {
    console.error('Tidak ada data kota untuk diinisialisasi');
    kotaSearchInput.placeholder = 'Data tidak tersedia';
    return;
  }

  // Filter function
  function filterKota(searchTerm) {
    if (!searchTerm.trim()) {
      return allKotaData;
    }
    const term = searchTerm.toLowerCase();
    return allKotaData.filter(k => 
      k && k.nama_kota && typeof k.nama_kota === 'string' && k.nama_kota.toLowerCase().includes(term)
    );
  }

  // Render dropdown results
  function renderDropdown(filteredData) {
    kotaDropdown.innerHTML = '';
    
    if (filteredData.length === 0) {
      kotaDropdown.innerHTML = '<div class="kota-dropdown-empty">Kota tidak ditemukan</div>';
      return;
    }

    filteredData.forEach((kota, index) => {
      // Validate kota data before rendering
      if (!kota || !kota.id_kota || !kota.nama_kota) {
        console.warn('Invalid kota data:', kota);
        return;
      }

      const item = document.createElement('div');
      item.className = 'kota-dropdown-item';
      item.textContent = kota.nama_kota;
      item.dataset.id = kota.id_kota;
      item.dataset.nama = kota.nama_kota;
      item.dataset.index = index;
      item.tabIndex = 0;
      
      item.addEventListener('click', () => selectKota(kota));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectKota(kota);
        }
      });
      
      kotaDropdown.appendChild(item);
    });
  }

  // Select kota
  function selectKota(kota) {
    // Validate kota data
    if (!kota || !kota.id_kota || !kota.nama_kota) {
      console.error('Invalid kota data:', kota);
      return;
    }

    isSelectingKota = true; // Set flag to prevent input handler from clearing
    
    kotaSearchInput.value = kota.nama_kota;
    hiddenSelectKota.value = kota.id_kota;
    kotaDropdown.classList.remove('show');
    selectedKotaIndex = -1;
    
    // Update selected state
    const items = kotaDropdown.querySelectorAll('.kota-dropdown-item');
    items.forEach(item => item.classList.remove('selected'));
    
    // Clear validation immediately
    kotaSearchInput.setCustomValidity('');
    
    // Trigger validation check
    kotaSearchInput.checkValidity();
    
    // Dispatch change event on select for form validation
    const changeEvent = new Event('change', { bubbles: true });
    hiddenSelectKota.dispatchEvent(changeEvent);
  }

  // Handle input
  let isSelectingKota = false; // Flag to prevent clearing during selection
  
  kotaSearchInput.addEventListener('input', (e) => {
    // Skip validation update if we're in the process of selecting
    if (isSelectingKota) {
      isSelectingKota = false;
      return;
    }
    
    const searchTerm = e.target.value;
    const filtered = filterKota(searchTerm);
    renderDropdown(filtered);
    
    if (searchTerm && filtered.length > 0) {
      kotaDropdown.classList.add('show');
    } else if (!searchTerm) {
      kotaDropdown.classList.remove('show');
    } else {
      kotaDropdown.classList.add('show');
    }
    
    // Clear selection only if input doesn't match selected kota
    if (hiddenSelectKota.value) {
      const selectedOption = hiddenSelectKota.querySelector(`option[value="${hiddenSelectKota.value}"]`);
      const selectedNama = selectedOption?.dataset.nama || selectedOption?.textContent || '';
      if (searchTerm.toLowerCase() !== selectedNama.toLowerCase()) {
        hiddenSelectKota.value = '';
        kotaSearchInput.setCustomValidity('Pilih Asal Daerah terlebih dahulu');
      } else {
        kotaSearchInput.setCustomValidity('');
      }
    } else {
      kotaSearchInput.setCustomValidity('Pilih Asal Daerah terlebih dahulu');
    }
  });

  // Handle focus
  kotaSearchInput.addEventListener('focus', () => {
    if (kotaSearchInput.value) {
      const filtered = filterKota(kotaSearchInput.value);
      renderDropdown(filtered);
      if (filtered.length > 0) {
        kotaDropdown.classList.add('show');
      }
    } else {
      renderDropdown(allKotaData);
      kotaDropdown.classList.add('show');
    }
  });

  // Handle keyboard navigation
  kotaSearchInput.addEventListener('keydown', (e) => {
    const items = kotaDropdown.querySelectorAll('.kota-dropdown-item');
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedKotaIndex = Math.min(selectedKotaIndex + 1, items.length - 1);
      items[selectedKotaIndex]?.focus();
      items.forEach((item, idx) => {
        item.classList.toggle('selected', idx === selectedKotaIndex);
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedKotaIndex = Math.max(selectedKotaIndex - 1, -1);
      if (selectedKotaIndex >= 0) {
        items[selectedKotaIndex]?.focus();
      } else {
        kotaSearchInput.focus();
      }
      items.forEach((item, idx) => {
        item.classList.toggle('selected', idx === selectedKotaIndex);
      });
    } else if (e.key === 'Enter' && selectedKotaIndex >= 0 && items[selectedKotaIndex]) {
      e.preventDefault();
      const selectedItem = items[selectedKotaIndex];
      const kota = {
        id_kota: selectedItem.dataset.id,
        nama_kota: selectedItem.dataset.nama
      };
      selectKota(kota);
    } else if (e.key === 'Escape') {
      kotaDropdown.classList.remove('show');
      selectedKotaIndex = -1;
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!kotaSearchInput.contains(e.target) && !kotaDropdown.contains(e.target)) {
      kotaDropdown.classList.remove('show');
      selectedKotaIndex = -1;
    }
  });

  // Prevent form submission if search input is focused and dropdown is open
  kotaSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && kotaDropdown.classList.contains('show') && selectedKotaIndex < 0) {
      e.preventDefault();
      if (kotaDropdown.querySelector('.kota-dropdown-item')) {
        const firstItem = kotaDropdown.querySelector('.kota-dropdown-item');
        const kota = {
          id_kota: firstItem.dataset.id,
          nama_kota: firstItem.dataset.nama
        };
        selectKota(kota);
      }
    }
  });

  // Listen to select change to update validation
  hiddenSelectKota.addEventListener('change', () => {
    if (hiddenSelectKota.value) {
      kotaSearchInput.setCustomValidity('');
      kotaSearchInput.checkValidity();
    } else {
      kotaSearchInput.setCustomValidity('Pilih Asal Daerah terlebih dahulu');
    }
  });
}

/* ==========================
   LOAD HEADER INFO (TANGGAL & WAKTU)
========================== */
const webinarTanggal = document.getElementById('webinar-tanggal');
const webinarWaktu = document.getElementById('webinar-waktu');

fetch(`${GAS_URL}?aksi=ambilHeader`)
  .then(res => res.json())
  .then(json => {
    if (!json.sukses) throw json.pesan;

    if (json.data.tanggal) {
      webinarTanggal.textContent = json.data.tanggal;
    }
    if (json.data.waktu) {
      webinarWaktu.textContent = json.data.waktu;
    }
  })
  .catch(err => {
    webinarTanggal.textContent = 'Tanggal belum ditentukan';
    webinarWaktu.textContent = 'Waktu belum ditentukan';
    console.error('Error loading header:', err);
  });

/* ==========================
   SUBMIT FORM
========================== */
form.addEventListener('submit', e => {
  e.preventDefault();

  if (submitBtn.disabled) return;

  // Validate kota selection - check select value (this is the source of truth)
  if (!hiddenSelectKota.value || hiddenSelectKota.value === '') {
    kotaSearchInput.setCustomValidity('Pilih Asal Daerah terlebih dahulu');
    kotaSearchInput.reportValidity();
    kotaSearchInput.focus();
    return;
  }
  
  // Clear any validation errors if kota is selected
  kotaSearchInput.setCustomValidity('');

  setButtonLoading(true);
  showMessage('Mengirim data...', 'info');

  const kotaOption = hiddenSelectKota.selectedOptions[0];

  const payload = {
    aksi: 'daftarPeserta',
    nama_lengkap: document.getElementById('nama').value.trim(),
    email: document.getElementById('email').value.trim(),
    institusi: document.getElementById('institusi').value.trim(),
    jabatan: document.getElementById('jabatan').value.trim(),
    kontak: document.getElementById('kontak').value.trim(),
    id_kota: hiddenSelectKota.value,
    nama_kota: kotaOption?.dataset.nama || '',
    usulan: document.getElementById('usulan').value.trim(),
    dikontak: document.querySelector('input[name="dikontak"]:checked')?.value || '',
    persetujuan: document.getElementById('setuju').checked
  };

  const body = new URLSearchParams(payload);

  fetch(GAS_URL, {
    method: 'POST',
    body
  })
    .then(res => res.json())
    .then(json => {
      setButtonLoading(false);

      if (!json.sukses) {
        showMessage(json.pesan || 'Terjadi kesalahan saat mendaftar', 'error');
        return;
      }

      showMessage('Pendaftaran berhasil! Terima kasih atas partisipasi Anda.', 'success');
      form.reset();
      hiddenSelectKota.value = '';
      kotaSearchInput.value = '';
      kotaDropdown.classList.remove('show');
    })
    .catch(err => {
      setButtonLoading(false);
      showMessage('Terjadi kesalahan jaringan. Silakan coba lagi.', 'error');
      console.error(err);
    });
});

/* ==========================
   MODAL - SYARAT DAN KETENTUAN
========================== */
const modal = document.getElementById('modal-syarat-ketentuan');
const linkSyaratKetentuan = document.getElementById('link-syarat-ketentuan');
const modalCloseBtns = document.querySelectorAll('.modal-close-btn, .modal-close-btn-footer');

function openModal() {
  if (!modal) return;
  
  modal.classList.add('show');
  document.body.classList.add('modal-open');
  
  // Focus trap - focus on close button
  const firstCloseBtn = modal.querySelector('.modal-close-btn');
  if (firstCloseBtn) {
    setTimeout(() => firstCloseBtn.focus(), 100);
  }
}

function closeModal() {
  if (!modal) return;
  
  modal.classList.remove('show');
  document.body.classList.remove('modal-open');
  
  // Return focus to the link that opened the modal
  if (linkSyaratKetentuan) {
    linkSyaratKetentuan.focus();
  }
}

// Open modal when link is clicked
if (linkSyaratKetentuan) {
  linkSyaratKetentuan.addEventListener('click', (e) => {
    e.preventDefault();
    openModal();
  });
}

// Close modal when close buttons are clicked
modalCloseBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    closeModal();
  });
});

// Close modal when clicking on backdrop
if (modal) {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
}

// Close modal with ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
    closeModal();
  }
});