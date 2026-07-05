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
  // Active Call Screen Overlay Selectors
  const activeCallOverlay = document.getElementById('screen-active-call');
  const activeCallAvatarText = document.getElementById('active-call-avatar-text');
  const activeCallNameLabel = document.getElementById('active-call-name-label');
  const activeCallStatusLabel = document.getElementById('active-call-status-label');
  const btnHangup = document.getElementById('btn-hangup');
  
  // Navigation Screens
  const screens = {
    calls: document.getElementById('screen-calls'),
    detail: document.getElementById('screen-detail'),
    contacts: document.getElementById('screen-contacts'),
    keypad: document.getElementById('screen-keypad')
  };
  
  // Bottom Tab Buttons
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
  let currentFilter = 'all'; // 'all' or 'missed'

  // Call Detail Screen Elements
  const btnDetailBack = document.getElementById('btn-detail-back');
  const detailAvatarText = document.getElementById('detail-avatar-text');
  const detailLocationLabel = document.getElementById('detail-location-label');
  const detailPhoneLabel = document.getElementById('detail-phone-label');
  const detailPhoneValue = document.getElementById('detail-phone-value');
  const detailCallHistoryContainer = document.getElementById('detail-call-history-container');

  // Keypad Screen Elements
  const dialedNumberOutput = document.getElementById('dialed-number-output');
  const btnAddDialed = document.getElementById('btn-add-dialed');
  const btnKeypadCall = document.getElementById('btn-keypad-call');
  const btnKeypadBackspace = document.getElementById('btn-keypad-backspace');
  const keypadKeys = document.querySelectorAll('.dial-key');

  // --- TIME AND DATE UTILITIES ---

  // Get date strings for "Yesterday" and "Yesterday's Full Date"
  function getYesterdayDates() {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    const yyyy = yesterday.getFullYear();
    const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
    const dd = String(yesterday.getDate() + 2 - 2).padStart(2, '0'); // Safe padding
    
    return {
      dateString: `${yyyy}/${mm}/${dd}`,
      dayLabel: 'Yesterday'
    };
  }

  // --- DATA GENERATOR (JAPANESE CALLS) ---
  const jpNames = [
    'Kenji Kobayashi', 'Akihiro Sato', 'Kiyoshi Tanaka', 'Sora Takahashi',
    'Yuki Watanabe', 'Hiroshi Suzuki', 'Takashi Sato', 'Nicole (Instagram)',
    'Minhhh', 'Kim Thư', 'Mẫu Thân'
  ];

  const jpRegions = ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Kyoto', 'Japan', 'unknown'];

  function generateJapaneseNumber() {
    const types = ['mobile', 'mobile', 'mobile', 'ip', 'landline', 'tollfree'];
    const selectedType = types[Math.floor(Math.random() * types.length)];
    
    let prefix = '080';
    let middle = String(Math.floor(1000 + Math.random() * 9000));
    let end = String(Math.floor(1000 + Math.random() * 9000));
    
    if (selectedType === 'mobile') {
      const prefixes = ['080', '090', '070'];
      prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    } else if (selectedType === 'ip') {
      prefix = '050';
    } else if (selectedType === 'landline') {
      const prefixes = ['03', '06', '045', '052', '075'];
      prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      if (prefix.length === 2) {
        middle = String(Math.floor(100 + Math.random() * 900));
        end = String(Math.floor(1000 + Math.random() * 9000));
      }
    } else if (selectedType === 'tollfree') {
      prefix = '0120';
      middle = String(Math.floor(100 + Math.random() * 900));
      end = String(Math.floor(100 + Math.random() * 900));
    }
    
    return `${prefix} ${middle} ${end}`;
  }

  function getRegionFromNumber(num) {
    if (num.startsWith('03')) return 'Tokyo';
    if (num.startsWith('06')) return 'Osaka';
    if (num.startsWith('045')) return 'Yokohama';
    if (num.startsWith('0120')) return 'unknown';
    return 'Japan';
  }

  function generateCallLogs() {
    const logs = [];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Start at yesterday at 09:00:00
    const currentCallTime = new Date(yesterday);
    currentCallTime.setHours(9, 0, 0, 0);
    
    // End at yesterday at 16:00:00
    const endLimit = new Date(yesterday);
    endLimit.setHours(16, 0, 0, 0);
    
    // We want to generate numbers, but also group them occasionally (simulate dialing the same contact multiple times)
    const activeNumberPool = [];
    for (let i = 0; i < 15; i++) {
      activeNumberPool.push({
        number: generateJapaneseNumber(),
        name: Math.random() > 0.65 ? jpNames[Math.floor(Math.random() * jpNames.length)] : null
      });
    }

    while (currentCallTime < endLimit) {
      // Pick from pool or generate new (60% pool, 40% new)
      let contact;
      if (Math.random() > 0.4 && activeNumberPool.length > 0) {
        contact = activeNumberPool[Math.floor(Math.random() * activeNumberPool.length)];
      } else {
        contact = {
          number: generateJapaneseNumber(),
          name: Math.random() > 0.85 ? jpNames[Math.floor(Math.random() * jpNames.length)] : null
        };
        // Add to pool occasionally, remove oldest
        if (activeNumberPool.length < 25) {
          activeNumberPool.push(contact);
        } else {
          activeNumberPool.shift();
          activeNumberPool.push(contact);
        }
      }

      // Outgoing call properties (calling consecutively every ~5 mins)
      // Duration is about 5 mins (e.g. 4.5 to 5.5 mins)
      const isAnswered = Math.random() > 0.25; // 75% picked up
      let durationSeconds = 0;
      let status = 'no-answer';
      let ringDuration = 30 + Math.floor(Math.random() * 15); // Ringing time: 30-45s
      
      if (isAnswered) {
        durationSeconds = 250 + Math.floor(Math.random() * 80); // ~4.5 to 5.5 minutes
        status = 'answered';
      }

      // Record call entry
      // Copy current call time
      const callStart = new Date(currentCallTime);
      
      logs.push({
        id: Math.random().toString(36).substring(2, 9),
        name: contact.name,
        number: contact.number,
        location: getRegionFromNumber(contact.number),
        direction: 'outgoing', // Outbound campaign
        status: status,
        startTime: callStart,
        duration: durationSeconds
      });

      // Advance time: call duration/ringing + post-call gap (30s to 2 mins)
      const gapSeconds = 30 + Math.floor(Math.random() * 90);
      const elapsedSeconds = (status === 'answered' ? durationSeconds : ringDuration) + gapSeconds;
      
      currentCallTime.setSeconds(currentCallTime.getSeconds() + elapsedSeconds);
    }
    
    // Inject a few incoming missed/answered calls to make history look realistic like screenshots
    // These occurred at random times yesterday
    const numIncoming = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numIncoming; i++) {
      const randHour = 9 + Math.floor(Math.random() * 7); // 9 to 15
      const randMin = Math.floor(Math.random() * 60);
      const incomingTime = new Date(yesterday);
      incomingTime.setHours(randHour, randMin, 0, 0);

      const contact = {
        number: generateJapaneseNumber(),
        name: Math.random() > 0.6 ? jpNames[Math.floor(Math.random() * jpNames.length)] : null
      };

      const isMissed = Math.random() > 0.5;
      logs.push({
        id: Math.random().toString(36).substring(2, 9),
        name: contact.name,
        number: contact.number,
        location: getRegionFromNumber(contact.number),
        direction: 'incoming',
        status: isMissed ? 'missed' : 'answered',
        startTime: incomingTime,
        duration: isMissed ? 0 : 60 + Math.floor(Math.random() * 200)
      });
    }

    // Sort calls: descending chronological order (newest first)
    logs.sort((a, b) => b.startTime - a.startTime);
    return logs;
  }

  // --- GROUPING LOGIC (iOS style) ---
  // In iOS, consecutive calls to/from the same number are grouped together.
  // We will build a function to group them for the list display.
  function groupCallLogs(logs) {
    const grouped = [];
    if (logs.length === 0) return grouped;
    
    let currentGroup = null;
    
    logs.forEach(log => {
      // Check if we can group with previous
      // Grouping criteria: same number AND same call status type (missed vs normal)
      const isMissed = log.status === 'missed' || log.status === 'no-answer';
      
      if (currentGroup && 
          currentGroup.number === log.number && 
          currentGroup.isMissed === isMissed) {
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
          isMissed: isMissed,
          // Store all logs in this group
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
    // 1. Filter original raw logs
    let filteredLogs = [...callLogs];
    
    // Filter by tab: All vs Missed
    if (filter === 'missed') {
      filteredLogs = filteredLogs.filter(log => log.status === 'missed' || log.status === 'no-answer');
    }
    
    // Filter by search query if any
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filteredLogs = filteredLogs.filter(log => {
        const nameMatch = log.name ? log.name.toLowerCase().includes(query) : false;
        const numMatch = log.number.replace(/\s+/g, '').includes(query.replace(/\s+/g, ''));
        const locMatch = log.location.toLowerCase().includes(query);
        return nameMatch || numMatch || locMatch;
      });
    }

    // Group the filtered logs for list view
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
      
      // Determine label (name or number)
      const displayName = group.name || group.number;
      
      // Secondary text formatting: arrow icon + location/type
      const directionArrow = latestCall.direction === 'outgoing' ? '↗' : '↙';
      const metaText = `${directionArrow} ${group.location}${count > 1 ? ` (${count})` : ''}`;
      
      // Format time label for row
      // Since they are all yesterday, show "Yesterday"
      // Except if it happens to match today's date (active dialing logs)
      const now = new Date();
      const isToday = latestCall.startTime.toDateString() === now.toDateString();
      let timeLabel = 'Yesterday';
      if (isToday) {
        let hrs = latestCall.startTime.getHours();
        let mins = latestCall.startTime.getMinutes();
        timeLabel = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      }

      // Initials for avatar
      let initials = 'JP';
      if (group.name) {
        const parts = group.name.split(' ');
        if (parts.length >= 2) {
          initials = (parts[0][0] + parts[1][0]).toUpperCase();
        } else {
          initials = group.name.substring(0, 2).toUpperCase();
        }
      } else {
        // Try getting region initials or default
        initials = group.number.substring(0, 3);
      }

      // Create item
      const itemEl = document.createElement('div');
      itemEl.className = `call-item ${group.isMissed ? 'missed' : ''}`;
      itemEl.dataset.id = group.id;
      
      itemEl.innerHTML = `
        <div class="call-avatar">${initials}</div>
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

      // Event listener: click row to open details
      itemEl.addEventListener('click', (e) => {
        // If clicking the dial button, don't open detail
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

  // --- CALL DETAIL PAGE NAVIGATION ---
  function openCallDetails(group) {
    // Set headers
    const displayName = group.name || group.number;
    detailPhoneLabel.textContent = displayName;
    detailPhoneValue.textContent = group.number;
    detailLocationLabel.textContent = group.location.toUpperCase();
    
    // Set avatar initials
    let initials = 'JP';
    if (group.name) {
      const parts = group.name.split(' ');
      initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : group.name.substring(0, 2).toUpperCase();
    } else {
      initials = group.number.substring(0, 3);
    }
    detailAvatarText.textContent = initials;
    
    // Populate details call logs
    detailCallHistoryContainer.innerHTML = '';
    
    group.calls.forEach(call => {
      const rowEl = document.createElement('div');
      rowEl.className = 'history-log-row';
      
      const dateLabel = formatFullDateTime(call.startTime);
      
      // Determine description
      let statusDesc = '';
      let isMissedClass = false;
      if (call.status === 'missed') {
        statusDesc = 'Missed Call';
        isMissedClass = true;
      } else if (call.status === 'no-answer') {
        statusDesc = 'No Answer';
        isMissedClass = true;
      } else {
        const durationText = formatDuration(call.duration);
        statusDesc = `${call.direction === 'outgoing' ? 'Outgoing Call' : 'Incoming Call'} (${durationText})`;
      }
      
      rowEl.innerHTML = `
        <span class="history-log-label ${isMissedClass ? 'missed' : ''}">${statusDesc}</span>
        <span class="history-log-time">${dateLabel}</span>
      `;
      detailCallHistoryContainer.appendChild(rowEl);
    });

    // Slide detail view in
    screens.detail.classList.add('active');
  }

  function formatFullDateTime(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hrs = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd} · ${hrs}:${mins}`;
  }

  function formatDuration(seconds) {
    if (seconds === 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  // --- TAB NAVIGATION SWITCHER ---
  function switchTab(tabName) {
    currentActiveTab = tabName;
    
    // Close detail screen if open
    screens.detail.classList.remove('active');
    
    // Update active screen class
    Object.keys(screens).forEach(key => {
      if (key !== 'detail') {
        screens[key].classList.toggle('active', key === tabName);
      }
    });

    // Update active tab buttons
    Object.keys(tabButtons).forEach(key => {
      tabButtons[key].classList.toggle('active', key === tabName);
    });

    // Slide tab indicator pill background
    let slideAmount = 0;
    if (tabName === 'contacts') {
      slideAmount = 88;
    } else if (tabName === 'keypad') {
      slideAmount = 176;
    }
    tabPill.style.transform = `translateX(${slideAmount}px)`;
  }

  // Tab button listeners
  Object.keys(tabButtons).forEach(key => {
    tabButtons[key].addEventListener('click', () => switchTab(key));
  });

  // Back button on detail screen
  btnDetailBack.addEventListener('click', () => {
    screens.detail.classList.remove('active');
  });

  // --- FILTER SYSTEM (ALL / MISSED) ---
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

  // --- SEARCH DRAWER OVERLAY ---
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

  // --- KEYPAD DIALER DIALOGUE ---
  
  // Format phone output dynamically
  function updateKeypadDisplay() {
    dialedNumberOutput.textContent = dialedNumber;
    
    // Show backspace and Add Contact buttons if digits entered
    const hasDigits = dialedNumber.length > 0;
    btnKeypadBackspace.style.visibility = hasDigits ? 'visible' : 'hidden';
    btnAddDialed.style.display = hasDigits ? 'block' : 'none';
    
    // Scale numbers text if too long
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
        
        // Dynamic feedback audio/vibe could be added here
      }
    });
  });

  btnKeypadBackspace.addEventListener('click', () => {
    dialedNumber = dialedNumber.slice(0, -1);
    updateKeypadDisplay();
  });

  // Long press backspace to clear all
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
    
    // Clean dynamic island and call overlay state
    if (activeCallInterval) {
      clearInterval(activeCallInterval);
    }
    
    activeCallNumber = number;
    activeCallState = 'calling';
    activeCallSeconds = 0;
    
    // Determine avatar initials for active call screen
    let initials = 'JP';
    let displayName = number;
    // Check if the number matches any contact
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
    activeCallStatusLabel.textContent = 'calling...';
    
    // Slide Up Active Call Overlay
    activeCallOverlay.classList.add('active');
    
    // Simulate calling progress
    // after 1.5 seconds, set status to 'connecting...'
    // after 3 seconds, call is answered and starts ticking
    let connectionTimeout = setTimeout(() => {
      activeCallStatusLabel.textContent = 'connecting...';
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

    // Hangup handler closure
    function hangUpCall() {
      // Clear timers
      clearTimeout(connectionTimeout);
      clearTimeout(answerTimeout);
      if (activeCallInterval) {
        clearInterval(activeCallInterval);
        activeCallInterval = null;
      }
      
      // Save call to logs (only if it reached active calling state or was dialled)
      // If duration is 0, it's considered unanswered (no-answer / cancelled)
      // Otherwise, save actual call duration (or default to 5 minutes for simulation if hung up immediately after answer)
      let finalDuration = activeCallSeconds;
      let finalStatus = 'answered';
      
      if (activeCallState === 'calling') {
        finalDuration = 0;
        finalStatus = 'no-answer';
      } else {
        // If hung up very quickly, give it a simulated 5 minutes (300 seconds) for user history requirements
        if (finalDuration < 3) {
          finalDuration = 300; 
        }
      }
      
      const newCall = {
        id: Math.random().toString(36).substring(2, 9),
        name: contactMatch ? contactMatch.name : null,
        number: activeCallNumber,
        location: getRegionFromNumber(activeCallNumber.replace(/\s+/g, '')),
        direction: 'outgoing',
        status: finalStatus,
        startTime: new Date(),
        duration: finalDuration
      };
      
      callLogs.unshift(newCall);
      renderCallList(currentFilter);
      
      // Slide down active call overlay
      activeCallOverlay.classList.remove('active');
      
      activeCallState = 'idle';
      
      // Remove this event listener to avoid stacking
      btnHangup.removeEventListener('click', hangUpCall);
    }
    
    // Attach Hang Up Button Listener
    btnHangup.addEventListener('click', hangUpCall);
  }

  btnKeypadCall.addEventListener('click', () => {
    if (dialedNumber) {
      dialNumber(dialedNumber);
      dialedNumber = '';
      updateKeypadDisplay();
    } else {
      // Dial last number in history
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
  switchTab('calls');
});
