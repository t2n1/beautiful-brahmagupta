document.addEventListener('DOMContentLoaded', () => {
  // --- STATE VARIABLES ---
  let callLogs = [];
  let currentActiveTab = 'calls';
  let dialedNumber = '';
  let activeCallInterval = null;
  let activeCallSeconds = 0;
  let activeCallNumber = '';
  let activeCallState = 'idle'; // 'idle', 'calling', 'active'

  // --- SELECTORS ---
  const activeCallOverlay = document.getElementById('screen-active-call');
  const activeCallAvatarText = document.getElementById('active-call-avatar-text');
  const activeCallNameLabel = document.getElementById('active-call-name-label');
  const activeCallStatusLabel = document.getElementById('active-call-status-label');
  const btnHangup = document.getElementById('btn-hangup');
  
  const screens = {
    calls: document.getElementById('screen-calls'),
    detail: document.getElementById('screen-detail'),
    contacts: document.getElementById('screen-contacts'),
    keypad: document.getElementById('screen-keypad')
  };
  
  const tabButtons = {
    calls: document.getElementById('tab-btn-calls'),
    contacts: document.getElementById('tab-btn-contacts'),
    keypad: document.getElementById('tab-btn-keypad')
  };
  const tabPill = document.getElementById('tab-pill');
  const btnOpenSearch = document.getElementById('btn-open-search');

  // Search Drawer
  const searchDrawer = document.getElementById('search-drawer');
  const searchInputField = document.getElementById('search-input-field');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const btnCancelSearch = document.getElementById('btn-cancel-search');
  const searchResultsList = document.getElementById('search-results-list');
  const searchEmpty = document.getElementById('search-empty');

  // Call Log View Elements
  const callLogListContainer = document.getElementById('call-log-list-container');
  const callsEmpty = document.getElementById('calls-empty');
  const btnFilterAll = document.getElementById('filter-all');
  const btnFilterMissed = document.getElementById('filter-missed');
  let currentFilter = 'all'; 

  // Call Detail Screen Elements
  const btnDetailBack = document.getElementById('btn-detail-back');
  const detailAvatarText = document.getElementById('detail-avatar-text');
  const detailLocationLabel = document.getElementById('detail-location-label');
  const detailPhoneLabel = document.getElementById('detail-phone-label');
  const detailPhoneValue = document.getElementById('detail-phone-value');
  const detailCallHistoryContainer = document.getElementById('detail-call-history-container');

  // Contacts Screen Elements
  const contactsListContainer = document.getElementById('contacts-list-container');

  // Keypad Screen Elements
  const dialedNumberOutput = document.getElementById('dialed-number-output');
  const btnAddDialed = document.getElementById('btn-add-dialed');
  const btnKeypadCall = document.getElementById('btn-keypad-call');
  const btnKeypadBackspace = document.getElementById('btn-keypad-backspace');
  const keypadKeys = document.querySelectorAll('.dial-key');

  // --- TIME AND DATE UTILITIES (VIETNAMESE) ---

  function formatTimeLabel(date) {
    const now = new Date();
    
    // Check if same calendar day
    const isToday = date.toDateString() === now.toDateString();
    
    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      let hrs = date.getHours();
      let mins = date.getMinutes();
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    } else if (isYesterday) {
      return 'Hôm qua';
    }
    
    // Check if within last 7 days
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      return days[date.getDay()];
    }
    
    // Older
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}`;
  }

  // --- DATA GENERATOR (VIETNAMESE CALLS & CONTACTS) ---
  const vnNames = [
    'Nay Zin',
    'Chân Trời Mới, Vui Kome, Bé Gạo, Tsu B...',
    '野村さん',
    'Anh Định',
    'Nguyễn Hằng',
    'Long Dinh Mart',
    'Nguyễn Thị Thanh Thư',
    'Nguyen Trong Dinh',
    'Hoàng Thị Hồng Giang',
    'Vũ Thị Tuyến',
    'Toàn Nguyễn',
    'Băng Tâm',
    'Nguyễn Thị Phương Mai',
    'Kaisha Green',
    'Thi Nguyễn',
    'Vũ Huệ',
    'Chân Trời Mới',
    'Đỗ Thị Minh Quí',
    'Minh Hà',
    'Thực Phẩm Việt SaiKyo',
    'Bé Gạo, Bảo, Cskh Kome, Kome Cskh, N...',
    'Phương Bình',
    'Thực Phẩm Việt Anjō',
    'Quỳnh Nguyễn',
    'Trần Nguyên',
    'Nguyên Tạ',
    'Mai Tran',
    'Xinmoi Tạp Hoá Hirakata',
    'Vũ Thảo Linh',
    'Kieu Diem'
  ];

  const callTypes = ['Messenger âm thanh', 'LINE âm thanh', 'điện thoại'];
  const locations = ['Nhật Bản', 'Hà Nội', 'TP. HCM', 'Việt Nam'];

  function generateVNPhoneNumber() {
    const prefixes = ['090', '098', '035', '036', '086', '079'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const middle = String(Math.floor(100 + Math.random() * 900));
    const end = String(Math.floor(1000 + Math.random() * 9000));
    return `${prefix} ${middle} ${end}`;
  }

  function generateCallLogs() {
    const logs = [];
    const now = new Date();
    
    // We want to generate logs over the last 5 days
    // Let's create an active pool of contacts
    const pool = [];
    
    // Force specific contacts for realism matching screenshots
    pool.push({ name: 'Nay Zin', number: '080 1234 5678', callType: 'LINE âm thanh', location: 'Nhật Bản' });
    pool.push({ name: 'Chân Trời Mới, Vui Kome, Bé Gạo, Tsu B...', number: '090 999 8888', callType: 'Messenger âm thanh', location: 'Việt Nam' });
    pool.push({ name: '野村さん', number: '080 9015 3089', callType: 'điện thoại', location: 'Nhật Bản' });
    pool.push({ name: 'Anh Định', number: '035 123 4567', callType: 'điện thoại', location: 'Hà Nội' });
    pool.push({ name: 'Nguyễn Hằng', number: '098 765 4321', callType: 'Messenger âm thanh', location: 'TP. HCM' });
    pool.push({ name: 'Long Dinh Mart', number: '090 222 3333', callType: 'Messenger âm thanh', location: 'Việt Nam' });
    
    // Add raw number (no name)
    pool.push({ name: null, number: '080 9015 3089', callType: 'điện thoại', location: 'Nhật Bản' });

    // Fill the rest with random names
    vnNames.forEach(name => {
      if (!pool.some(p => p.name === name)) {
        pool.push({
          name: name,
          number: generateVNPhoneNumber(),
          callType: callTypes[Math.floor(Math.random() * callTypes.length)],
          location: locations[Math.floor(Math.random() * locations.length)]
        });
      }
    });

    // Generate call logs distributed over days
    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const callDate = new Date(now);
      callDate.setDate(now.getDate() - dayOffset);
      
      // Random number of calls on this day
      const count = dayOffset === 0 ? 5 : 8 + Math.floor(Math.random() * 5);
      
      for (let i = 0; i < count; i++) {
        const contact = pool[Math.floor(Math.random() * pool.length)];
        
        // Random hour & minute
        const timestamp = new Date(callDate);
        timestamp.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);

        const isMissed = Math.random() > 0.7; // 30% missed calls
        const direction = Math.random() > 0.4 ? 'incoming' : 'outgoing';
        
        logs.push({
          id: Math.random().toString(36).substring(2, 9),
          name: contact.name,
          number: contact.number,
          location: contact.location,
          callType: contact.callType,
          direction: direction,
          status: isMissed ? 'missed' : 'answered',
          startTime: timestamp,
          duration: isMissed ? 0 : 30 + Math.floor(Math.random() * 300)
        });
      }
    }

    // Sort calls: descending chronological order (newest first)
    logs.sort((a, b) => b.startTime - a.startTime);
    return logs;
  }

  // --- GROUPING LOGIC (iOS style) ---
  function groupCallLogs(logs) {
    const grouped = [];
    if (logs.length === 0) return grouped;
    
    let currentGroup = null;
    
    logs.forEach(log => {
      const isMissed = log.status === 'missed';
      
      if (currentGroup && 
          currentGroup.number === log.number && 
          currentGroup.isMissed === isMissed &&
          currentGroup.name === log.name) {
        currentGroup.calls.push(log);
      } else {
        if (currentGroup) {
          grouped.push(currentGroup);
        }
        currentGroup = {
          id: log.id,
          name: log.name,
          number: log.number,
          location: log.location,
          callType: log.callType,
          isMissed: isMissed,
          calls: [log]
        };
      }
    });
    
    if (currentGroup) {
      grouped.push(currentGroup);
    }
    
    return grouped;
  }

  // --- RENDER CALL LOG LIST ---
  function renderCallList(filter = 'all', searchQuery = '') {
    let filteredLogs = [...callLogs];
    
    if (filter === 'missed') {
      filteredLogs = filteredLogs.filter(log => log.status === 'missed');
    }
    
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filteredLogs = filteredLogs.filter(log => {
        const nameMatch = log.name ? log.name.toLowerCase().includes(query) : false;
        const numMatch = log.number.replace(/\s+/g, '').includes(query.replace(/\s+/g, ''));
        const locMatch = log.location.toLowerCase().includes(query);
        return nameMatch || numMatch || locMatch;
      });
    }

    const grouped = groupCallLogs(filteredLogs);
    const container = searchQuery ? searchResultsList : callLogListContainer;
    container.innerHTML = '';
    
    const emptyState = searchQuery ? searchEmpty : callsEmpty;
    
    if (grouped.length === 0) {
      emptyState.style.display = 'block';
      return;
    } else {
      emptyState.style.display = 'none';
    }

    grouped.forEach(group => {
      const latestCall = group.calls[0];
      const count = group.calls.length;
      
      const displayName = group.name || group.number;
      const directionArrow = latestCall.direction === 'outgoing' ? '↗' : '↙';
      
      // Determine label text in Vietnamese
      let labelText = '';
      if (group.name) {
        labelText = group.callType || 'điện thoại';
      } else {
        labelText = group.location || 'Nhật Bản';
      }
      
      const metaText = `${labelText}${count > 1 ? ` (${count})` : ''}`;
      const timeLabel = formatTimeLabel(latestCall.startTime);

      // Render custom silhouette avatar or letter-based avatar
      let avatarHTML = '';
      if (group.name && group.name.startsWith('Anh ')) {
        const letter = group.name.replace('Anh ', '')[0].toUpperCase();
        avatarHTML = `<div class="call-avatar letter">${letter}</div>`;
      } else if (group.name && group.name.startsWith('Nguyễn ')) {
        const letter = group.name.replace('Nguyễn ', '')[0].toUpperCase();
        avatarHTML = `<div class="call-avatar letter">${letter}</div>`;
      } else {
        avatarHTML = `
          <div class="call-avatar silhouette">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
        `;
      }

      const itemEl = document.createElement('div');
      itemEl.className = `call-item ${group.isMissed ? 'missed' : ''}`;
      itemEl.dataset.id = group.id;
      
      itemEl.innerHTML = `
        ${avatarHTML}
        <div class="call-info-wrap">
          <div class="call-number-name">${displayName}</div>
          <div class="call-meta">
            <span class="call-arrow">${directionArrow}</span>
            <span>${metaText}</span>
          </div>
        </div>
        <div class="call-right-action">
          <span class="call-time-label">${timeLabel}</span>
          <button class="call-action-btn" data-phone="${group.number}">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M20.01,15.38c-1.23,0-2.42-0.2-3.53-0.57c-0.35-0.11-0.74-0.03-1.02,0.24l-2.2,2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c0.28-0.26,0.36-0.65,0.25-1C8.75,6.41,8.55,5.22,8.55,4c0-0.55-0.45-1-1-1H4c-0.55,0-1,0.45-1,1c0,9.39,7.61,17,17,17c0.55,0,1-0.45,1-1v-3.5C21.01,15.83,20.56,15.38,20.01,15.38z"/>
            </svg>
          </button>
        </div>
      `;

      itemEl.addEventListener('click', (e) => {
        if (e.target.closest('.call-action-btn')) {
          const number = e.target.closest('.call-action-btn').dataset.phone;
          dialNumber(number);
          return;
        }
        openCallDetails(group);
      });

      container.appendChild(itemEl);
    });
  }

  // --- RENDER CONTACTS LIST ---
  function renderContactsList() {
    contactsListContainer.innerHTML = '';
    
    // Sort names alphabetically
    const sortedNames = [...vnNames].sort((a, b) => a.localeCompare(b, 'vi'));
    
    let currentLetter = '';
    
    sortedNames.forEach(name => {
      // Get first letter
      let firstChar = name.charAt(0).toUpperCase();
      
      // Normalise Vietnamese accents for headers
      const normalizedChar = firstChar.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      if (normalizedChar !== currentLetter) {
        currentLetter = normalizedChar;
        const letterHeader = document.createElement('div');
        letterHeader.className = 'contact-section-header';
        letterHeader.textContent = currentLetter;
        contactsListContainer.appendChild(letterHeader);
      }
      
      const itemEl = document.createElement('div');
      itemEl.className = 'contact-item';
      itemEl.textContent = name;
      
      itemEl.addEventListener('click', () => {
        // Dial contact
        const contactNumber = generateVNPhoneNumber();
        dialNumber(contactNumber);
      });
      
      contactsListContainer.appendChild(itemEl);
    });
  }

  // --- CALL DETAIL PAGE NAVIGATION ---
  function openCallDetails(group) {
    const displayName = group.name || group.number;
    detailPhoneLabel.textContent = displayName;
    detailPhoneValue.textContent = group.number;
    detailLocationLabel.textContent = group.location.toUpperCase();
    
    let initials = 'TN';
    if (group.name) {
      const parts = group.name.split(' ');
      initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : group.name.substring(0, 2).toUpperCase();
    } else {
      initials = group.number.substring(0, 3);
    }
    detailAvatarText.textContent = initials;
    
    detailCallHistoryContainer.innerHTML = '';
    
    group.calls.forEach(call => {
      const rowEl = document.createElement('div');
      rowEl.className = 'history-log-row';
      
      const dateLabel = formatFullDateTime(call.startTime);
      
      let statusDesc = '';
      let isMissedClass = false;
      if (call.status === 'missed') {
        statusDesc = 'Cuộc gọi nhỡ';
        isMissedClass = true;
      } else {
        const durationText = formatDuration(call.duration);
        statusDesc = `${call.direction === 'outgoing' ? 'Cuộc gọi đi' : 'Cuộc gọi đến'} (${durationText})`;
      }
      
      rowEl.innerHTML = `
        <span class="history-log-label ${isMissedClass ? 'missed' : ''}">${statusDesc}</span>
        <span class="history-log-time">${dateLabel}</span>
      `;
      detailCallHistoryContainer.appendChild(rowEl);
    });

    screens.detail.classList.add('active');
  }

  function formatFullDateTime(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hrs = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} · ${hrs}:${mins}`;
  }

  function formatDuration(seconds) {
    if (seconds === 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}p ${secs}s`;
    }
    return `${secs}s`;
  }

  // --- TAB NAVIGATION SWITCHER ---
  function switchTab(tabName) {
    currentActiveTab = tabName;
    screens.detail.classList.remove('active');
    
    Object.keys(screens).forEach(key => {
      if (key !== 'detail') {
        screens[key].classList.toggle('active', key === tabName);
      }
    });

    Object.keys(tabButtons).forEach(key => {
      tabButtons[key].classList.toggle('active', key === tabName);
    });

    let slideAmount = 0;
    if (tabName === 'contacts') {
      slideAmount = 88;
    } else if (tabName === 'keypad') {
      slideAmount = 176;
    }
    tabPill.style.transform = `translateX(${slideAmount}px)`;
  }

  Object.keys(tabButtons).forEach(key => {
    tabButtons[key].addEventListener('click', () => switchTab(key));
  });

  btnDetailBack.addEventListener('click', () => {
    screens.detail.classList.remove('active');
  });

  btnFilterAll.addEventListener('click', () => {
    currentFilter = 'all';
    btnFilterAll.classList.add('active');
    btnFilterMissed.classList.remove('active');
    renderCallList(currentFilter);
  });

  btnFilterMissed.addEventListener('click', () => {
    currentFilter = 'missed';
    btnFilterMissed.classList.add('active');
    btnFilterAll.classList.remove('active');
    renderCallList(currentFilter);
  });

  btnOpenSearch.addEventListener('click', () => {
    searchDrawer.classList.add('active');
    searchInputField.value = '';
    searchInputField.focus();
    renderCallList(currentFilter, '');
  });

  btnCancelSearch.addEventListener('click', () => {
    searchDrawer.classList.remove('active');
  });

  searchInputField.addEventListener('input', (e) => {
    const val = e.target.value;
    btnClearSearch.style.display = val ? 'flex' : 'none';
    renderCallList(currentFilter, val);
  });

  btnClearSearch.addEventListener('click', () => {
    searchInputField.value = '';
    btnClearSearch.style.display = 'none';
    searchInputField.focus();
    renderCallList(currentFilter, '');
  });

  // --- KEYPAD DIALER ---
  function updateKeypadDisplay() {
    dialedNumberOutput.textContent = dialedNumber;
    const hasDigits = dialedNumber.length > 0;
    btnKeypadBackspace.style.visibility = hasDigits ? 'visible' : 'hidden';
    btnAddDialed.style.display = hasDigits ? 'block' : 'none';
    
    if (dialedNumber.length > 10) {
      dialedNumberOutput.style.fontSize = '26px';
    } else if (dialedNumber.length > 7) {
      dialedNumberOutput.style.fontSize = '32px';
    } else {
      dialedNumberOutput.style.fontSize = '38px';
    }
  }

  keypadKeys.forEach(key => {
    key.addEventListener('click', () => {
      const val = key.dataset.key;
      if (dialedNumber.length < 16) {
        dialedNumber += val;
        updateKeypadDisplay();
      }
    });
  });

  btnKeypadBackspace.addEventListener('click', () => {
    dialedNumber = dialedNumber.slice(0, -1);
    updateKeypadDisplay();
  });

  let backspaceTimer;
  btnKeypadBackspace.addEventListener('mousedown', () => {
    backspaceTimer = setTimeout(() => {
      dialedNumber = '';
      updateKeypadDisplay();
    }, 600);
  });
  btnKeypadBackspace.addEventListener('mouseup', () => clearTimeout(backspaceTimer));
  btnKeypadBackspace.addEventListener('mouseleave', () => clearTimeout(backspaceTimer));
  btnKeypadBackspace.addEventListener('touchstart', () => {
    backspaceTimer = setTimeout(() => {
      dialedNumber = '';
      updateKeypadDisplay();
    }, 600);
  });
  btnKeypadBackspace.addEventListener('touchend', () => clearTimeout(backspaceTimer));

  // --- INTERACTIVE OUTGOING CALL INTERACTION ---
  function dialNumber(number) {
    if (!number) return;
    
    if (activeCallInterval) {
      clearInterval(activeCallInterval);
    }
    
    activeCallNumber = number;
    activeCallState = 'calling';
    activeCallSeconds = 0;
    
    let initials = 'TN';
    let displayName = number;
    const contactMatch = callLogs.find(c => c.number === number && c.name);
    if (contactMatch) {
      displayName = contactMatch.name;
      const parts = displayName.split(' ');
      initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : displayName.substring(0, 2).toUpperCase();
    } else {
      initials = number.replace(/\s+/g, '').substring(0, 3);
    }
    
    activeCallAvatarText.textContent = initials;
    activeCallNameLabel.textContent = displayName;
    activeCallStatusLabel.textContent = 'đang gọi...';
    
    activeCallOverlay.classList.add('active');
    
    let connectionTimeout = setTimeout(() => {
      activeCallStatusLabel.textContent = 'đang kết nối...';
    }, 1500);
    
    let answerTimeout = setTimeout(() => {
      activeCallState = 'active';
      activeCallStatusLabel.textContent = '00:00';
      
      activeCallInterval = setInterval(() => {
        activeCallSeconds++;
        const mins = Math.floor(activeCallSeconds / 60);
        const secs = activeCallSeconds % 60;
        activeCallStatusLabel.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }, 1000);
    }, 3000);

    function hangUpCall() {
      clearTimeout(connectionTimeout);
      clearTimeout(answerTimeout);
      if (activeCallInterval) {
        clearInterval(activeCallInterval);
        activeCallInterval = null;
      }
      
      let finalDuration = activeCallSeconds;
      let finalStatus = 'answered';
      
      if (activeCallState === 'calling') {
        finalDuration = 0;
        finalStatus = 'missed';
      } else {
        if (finalDuration < 3) {
          finalDuration = 300; 
        }
      }
      
      const newCall = {
        id: Math.random().toString(36).substring(2, 9),
        name: contactMatch ? contactMatch.name : null,
        number: activeCallNumber,
        location: contactMatch ? contactMatch.location : 'Việt Nam',
        callType: contactMatch ? contactMatch.callType : 'điện thoại',
        direction: 'outgoing',
        status: finalStatus,
        startTime: new Date(),
        duration: finalDuration
      };
      
      callLogs.unshift(newCall);
      renderCallList(currentFilter);
      
      activeCallOverlay.classList.remove('active');
      activeCallState = 'idle';
      btnHangup.removeEventListener('click', hangUpCall);
    }
    
    btnHangup.addEventListener('click', hangUpCall);
  }

  btnKeypadCall.addEventListener('click', () => {
    if (dialedNumber) {
      dialNumber(dialedNumber);
      dialedNumber = '';
      updateKeypadDisplay();
    } else {
      if (callLogs.length > 0) {
        dialedNumber = callLogs[0].number;
        updateKeypadDisplay();
      }
    }
  });

  btnAddDialed.addEventListener('click', () => {
    alert(`Mock Contact Created: ${dialedNumber}`);
    dialedNumber = '';
    updateKeypadDisplay();
  });

  // --- INITIALIZE APPLICATION ---
  callLogs = generateCallLogs();
  renderCallList('all');
  renderContactsList();
  switchTab('calls');
});
