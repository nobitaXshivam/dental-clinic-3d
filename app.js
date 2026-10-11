/* ==========================================================================
   SmileCare Dental Clinic — booking flow
   ========================================================================== */
(function () {
  'use strict';

  var WHATSAPP_NUMBER = '919302392523';
  var CLINIC_NAME = 'SmileCare Dental Clinic';
  var CLINIC_TAGLINE = 'Your Smile, Our Care';
  var CLINIC_PHONE = '+91 93023 92523';

  /* ---------- Data ---------- */
  var SERVICES = [
    { id: 'consult',  name: 'Dental Consultation & X-ray', desc: 'Full oral check-up, problem diagnosis and a digital X-ray if needed.', price: 300,  dur: '20 min', icon: 'ph-stethoscope', badge: '' },
    { id: 'clean',    name: 'Scaling & Polishing',          desc: 'Professional deep cleaning to remove plaque, tartar and stains.',       price: 900,  dur: '30 min', icon: 'ph-sparkle',     badge: 'Popular' },
    { id: 'filling',  name: 'Tooth Filling',                desc: 'Durable tooth-coloured composite filling for cavities and chips.',     price: 1200, dur: '30 min', icon: 'ph-tooth',       badge: '' },
    { id: 'rct',      name: 'Root Canal Treatment',         desc: 'Painless root canal therapy to save an infected or damaged tooth.',    price: 4500, dur: '60 min', icon: 'ph-first-aid',   badge: 'Popular' },
    { id: 'extract',  name: 'Tooth Extraction',             desc: 'Safe, gentle removal of decayed or impacted teeth.',                   price: 900,  dur: '30 min', icon: 'ph-tooth',       badge: '' },
    { id: 'crown',    name: 'Zirconia Crown',               desc: 'Strong, natural-looking ceramic crown to restore a broken tooth.',     price: 6500, dur: '45 min', icon: 'ph-crown',       badge: '' },
    { id: 'whiten',   name: 'Teeth Whitening',              desc: 'Professional whitening for a visibly brighter smile in one visit.',    price: 5500, dur: '60 min', icon: 'ph-sparkle',     badge: '' },
    { id: 'implant',  name: 'Dental Implant',               desc: 'Permanent titanium implant to replace a missing tooth root.',          price: 27000,dur: '90 min', icon: 'ph-screwdriver', badge: '' },
    { id: 'braces',   name: 'Braces & Aligners Consult',    desc: 'Orthodontic assessment with a personalised alignment plan.',           price: 500,  dur: '30 min', icon: 'ph-align-center-vertical', badge: '' },
    { id: 'kids',     name: 'Kids Dentistry',               desc: 'Friendly, fear-free dental care designed for children.',               price: 600,  dur: '30 min', icon: 'ph-baby',        badge: '' }
  ];

  var SLOTS = ['10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30'];

  /* ---------- State ---------- */
  var state = { service: null, date: '', time: '', name: '', age: '', mobile: '', address: '' };
  var currentStep = 1;
  var lastFocused = null;

  /* ---------- Element refs ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var servicesGrid   = $('#servicesGrid');
  var serviceOptions = $('#serviceOptions');
  var timeGrid       = $('#timeGrid');
  var dateInput      = $('#date');
  var form           = $('#bookingForm');
  var stepperItems   = $$('.stepper-item');
  var wizardSteps    = $$('.wizard-step');
  var prevBtn        = $('#prevBtn');
  var nextBtn        = $('#nextBtn');
  var submitBtn      = $('#submitBtn');
  var modal          = $('#confirmModal');
  var waBtn          = $('#waBtn');
  var pdfBtn         = $('#pdfBtn');
  var toastEl        = $('#toast');
  var inputs = { name: $('#name'), age: $('#age'), mobile: $('#mobile'), address: $('#address') };

  /* ---------- Utilities ---------- */
  function money(n) { return '\u20B9' + Number(n).toLocaleString('en-IN'); }

  function todayISO() {
    var d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function formatDateLong(iso) {
    if (!iso) return '\u2014';
    var p = iso.split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function formatDateShort(iso) {
    if (!iso) return '\u2014';
    var p = iso.split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatTime12(t) {
    if (!t) return '\u2014';
    var parts = t.split(':');
    var h = Number(parts[0]), m = parts[1];
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return h12 + ':' + m + ' ' + ampm;
  }

  function randId() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = '';
    for (var i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function makeBookingId(iso) {
    return 'SC' + iso.replace(/-/g, '') + '-' + randId();
  }

  function makeToken(iso) {
    var key = 'sc_tokens_' + iso;
    var count = 0;
    try { count = parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch (e) { count = 0; }
    var token = count + 1;
    try { localStorage.setItem(key, String(token)); } catch (e) {}
    return ('00' + token).slice(-3);
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    requestAnimationFrame(function () { toastEl.classList.add('show'); });
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      toastEl.classList.remove('show');
      setTimeout(function () { toastEl.hidden = true; }, 250);
    }, 3200);
  }

  function setFieldError(input, errorEl, show) {
    var field = input.closest('.field');
    if (field) field.classList.toggle('invalid', show);
    if (errorEl) errorEl.hidden = !show;
  }

  /* ---------- Render services ---------- */
  function renderServices() {
    var frag = document.createDocumentFragment();
    SERVICES.forEach(function (s) {
      var card = document.createElement('article');
      card.className = 'service-card';
      card.innerHTML =
        '<div class="service-top">' +
          '<span class="service-icon"><i class="ph ' + s.icon + '" aria-hidden="true"></i></span>' +
          (s.badge ? '<span class="service-badge">' + s.badge + '</span>' : '') +
        '</div>' +
        '<h3>' + s.name + '</h3>' +
        '<p>' + s.desc + '</p>' +
        '<div class="service-meta">' +
          '<span class="service-price">' + money(s.price) + '<small>starting</small></span>' +
          '<span class="service-dur"><i class="ph ph-clock" aria-hidden="true"></i>' + s.dur + '</span>' +
        '</div>' +
        '<button class="btn btn-outline book-btn" type="button" data-service="' + s.id + '">' +
          '<i class="ph ph-calendar-plus" aria-hidden="true"></i> Book this</button>';
      frag.appendChild(card);
    });
    servicesGrid.appendChild(frag);

    servicesGrid.addEventListener('click', function (e) {
      var btn = e.target.closest('.book-btn');
      if (!btn) return;
      selectService(btn.getAttribute('data-service'));
      goToStep(2);
      document.getElementById('booking').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function renderServiceOptions() {
    var frag = document.createDocumentFragment();
    SERVICES.forEach(function (s) {
      var label = document.createElement('label');
      label.className = 'service-opt';
      label.innerHTML =
        '<input type="radio" name="service" value="' + s.id + '" />' +
        '<span class="opt-icon"><i class="ph ' + s.icon + '" aria-hidden="true"></i></span>' +
        '<span class="opt-body">' +
          '<span class="opt-name">' + s.name + '</span>' +
          '<span class="opt-price">' + money(s.price) + ' \u00B7 ' + s.dur + '</span>' +
        '</span>' +
        '<span class="opt-check"><i class="ph-fill ph-check" aria-hidden="true"></i></span>';
      frag.appendChild(label);
    });
    serviceOptions.appendChild(frag);

    serviceOptions.addEventListener('change', function (e) {
      if (e.target.name === 'service') {
        state.service = SERVICES.filter(function (s) { return s.id === e.target.value; })[0] || null;
        $('#step1Error').hidden = true;
        updateSummary();
      }
    });
  }

  function selectService(id) {
    var radio = serviceOptions.querySelector('input[value="' + id + '"]');
    if (radio) { radio.checked = true; }
    state.service = SERVICES.filter(function (s) { return s.id === id; })[0] || null;
    $('#step1Error').hidden = true;
    updateSummary();
  }

  /* ---------- Time slots ---------- */
  function renderTimeSlots() {
    timeGrid.innerHTML = '';
    if (!state.date) {
      timeGrid.innerHTML = '<p class="time-empty">Select a date to see available slots.</p>';
      return;
    }
    var isToday = state.date === todayISO();
    var now = new Date();
    var nowMins = now.getHours() * 60 + now.getMinutes();
    var anyAvailable = false;

    SLOTS.forEach(function (slot) {
      var p = slot.split(':');
      var slotMins = Number(p[0]) * 60 + Number(p[1]);
      var disabled = isToday && slotMins <= nowMins + 30;
      if (!disabled) anyAvailable = true;

      var label = document.createElement('label');
      label.className = 'time-slot';
      label.innerHTML =
        '<input type="radio" name="time" value="' + slot + '"' + (disabled ? ' disabled' : '') + ' />' +
        formatTime12(slot);
      if (disabled) {
        label.style.opacity = '.4';
        label.style.cursor = 'not-allowed';
        label.setAttribute('aria-disabled', 'true');
      }
      timeGrid.appendChild(label);
    });

    if (!anyAvailable) {
      timeGrid.insertAdjacentHTML('beforeend',
        '<p class="time-empty">No slots left today. Please choose another date.</p>');
    }
  }

  timeGrid.addEventListener('change', function (e) {
    if (e.target.name === 'time') {
      state.time = e.target.value;
      $('#timeError').hidden = true;
      updateSummary();
    }
  });

  /* ---------- Wizard navigation ---------- */
  function goToStep(n) {
    currentStep = n;
    wizardSteps.forEach(function (step) {
      step.hidden = Number(step.getAttribute('data-step')) !== n;
    });
    stepperItems.forEach(function (item) {
      var s = Number(item.getAttribute('data-step'));
      item.classList.toggle('is-active', s === n);
      item.classList.toggle('is-done', s < n);
    });
    prevBtn.hidden = n === 1;
    nextBtn.hidden = n === 3;
    submitBtn.hidden = n !== 3;

    var active = wizardSteps.filter(function (s) { return Number(s.getAttribute('data-step')) === n; })[0];
    if (active) {
      var focusable = active.querySelector('input, textarea');
      if (focusable && n !== 1) focusable.focus({ preventScroll: true });
    }
  }

  function validateStep1() {
    var ok = !!state.service;
    $('#step1Error').hidden = ok;
    return ok;
  }

  function validateStep2() {
    var okDate = !!state.date && state.date >= todayISO();
    var okTime = !!state.time;
    setFieldError(dateInput, $('#dateError'), !okDate);
    $('#timeError').hidden = okTime;
    return okDate && okTime;
  }

  function validateStep3() {
    var ok = true;
    var name = inputs.name.value.trim();
    var mobile = inputs.mobile.value.trim();
    var age = inputs.age.value.trim();
    var address = inputs.address.value.trim();

    var nameOk = name.length >= 2;
    setFieldError(inputs.name, $('#nameError'), !nameOk);
    ok = ok && nameOk;

    var ageOk = /^\d{1,3}$/.test(age) && Number(age) >= 1 && Number(age) <= 120;
    setFieldError(inputs.age, $('#ageError'), !ageOk);
    ok = ok && ageOk;

    var mobileOk = /^[6-9]\d{9}$/.test(mobile);
    setFieldError(inputs.mobile, $('#mobileError'), !mobileOk);
    ok = ok && mobileOk;

    var addrOk = address.length >= 5;
    setFieldError(inputs.address, $('#addressError'), !addrOk);
    ok = ok && addrOk;

    if (ok) {
      state.name = name; state.mobile = mobile; state.age = age; state.address = address;
    }
    return ok;
  }

  function validateAll() {
    var a = validateStep1();
    var b = validateStep2();
    var c = validateStep3();
    if (!a) { goToStep(1); return false; }
    if (!b) { goToStep(2); return false; }
    if (!c) { goToStep(3); return false; }
    return true;
  }

  nextBtn.addEventListener('click', function () {
    if (currentStep === 1 && !validateStep1()) { showToast('Please select a service.'); return; }
    if (currentStep === 2 && !validateStep2()) { showToast('Please choose a date and time slot.'); return; }
    goToStep(currentStep + 1);
  });

  prevBtn.addEventListener('click', function () { goToStep(currentStep - 1); });

  inputs.mobile.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 10);
  });
  inputs.age.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 3);
  });

  dateInput.min = todayISO();

  dateInput.addEventListener('change', function () {
    state.date = this.value;
    if (state.date && state.date < todayISO()) {
      this.value = ''; state.date = '';
      setFieldError(dateInput, $('#dateError'), true);
      showToast('Please pick today or a future date.');
    } else {
      setFieldError(dateInput, $('#dateError'), false);
    }
    state.time = '';
    renderTimeSlots();
    updateSummary();
  });

  /* ---------- Summary ---------- */
  function updateSummary() {
    $('#sumService').textContent = state.service ? state.service.name : 'Not selected';
    $('#sumDate').textContent = state.date ? formatDateShort(state.date) : '\u2014';
    $('#sumTime').textContent = state.time ? formatTime12(state.time) : '\u2014';
    var name = inputs.name.value.trim();
    $('#sumName').textContent = name || '\u2014';
    $('#sumPrice').textContent = state.service ? money(state.service.price) : '\u20B90';
  }
  Object.keys(inputs).forEach(function (k) {
    inputs[k].addEventListener('input', updateSummary);
  });

  /* ---------- Modal ---------- */
  function openModal() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.modal-close', modal).focus();
  }
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }
  modal.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
    if (e.key === 'Tab' && !modal.hidden) trapFocus(e);
  });
  function trapFocus(e) {
    var focusables = $$('a[href], button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])', modal)
      .filter(function (el) { return el.offsetParent !== null; });
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- Build booking / WhatsApp ---------- */
  var booking = null;

  function buildBooking() {
    var id = makeBookingId(state.date);
    var token = makeToken(state.date);
    booking = {
      id: id,
      token: token,
      service: state.service,
      date: state.date,
      dateLong: formatDateLong(state.date),
      dateShort: formatDateShort(state.date),
      time: state.time,
      time12: formatTime12(state.time),
      name: state.name,
      age: state.age,
      mobile: state.mobile,
      address: state.address
    };
    return booking;
  }

  function whatsappLink(b) {
    var lines = [
      '\uD83E\uDDB7 *New Appointment Request*',
      '',
      '*Booking ID:* ' + b.id,
      '*Token No:* #' + b.token,
      '*Patient:* ' + b.name,
      '*Age:* ' + b.age,
      '*Mobile:* +91 ' + b.mobile,
      '*Service:* ' + b.service.name,
      '*Date:* ' + b.dateLong,
      '*Time:* ' + b.time12,
      '*Address:* ' + b.address,
      '',
      'Please confirm my appointment. Thank you!'
    ];
    return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
  }

  function fillTicket(b) {
    $('#ticketId').textContent = b.id;
    $('#ticketToken').textContent = '#' + b.token;
    $('#ticketService').textContent = b.service.name;
    $('#ticketDate').textContent = b.dateShort;
    $('#ticketTime').textContent = b.time12;
    $('#ticketName').textContent = b.name;
    $('#ticketMobile').textContent = '+91 ' + b.mobile;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateAll()) { showToast('Please fix the highlighted fields.'); return; }
    buildBooking();
    fillTicket(booking);
    waBtn.href = whatsappLink(booking);
    openModal();
  });

  pdfBtn.addEventListener('click', function () {
    if (!booking) return;
    if (window.jspdf && window.jspdf.jsPDF) {
      generatePDF(booking);
    } else {
      showToast('PDF engine is still loading. Please try again in a moment.');
    }
  });

  /* ---------- PDF generation (jsPDF) ---------- */
  function toothDataURL(color) {
    var size = 700;
    var c = document.createElement('canvas');
    c.width = size; c.height = size;
    var ctx = c.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.scale(size / 100, size / 100);
    ctx.translate(-50, -50);
    ctx.beginPath();
    ctx.moveTo(50, 6);
    ctx.bezierCurveTo(20, 6, 7, 30, 9, 56);
    ctx.bezierCurveTo(10, 74, 18, 90, 29, 94);
    ctx.bezierCurveTo(38, 97, 41, 83, 45, 68);
    ctx.bezierCurveTo(46.5, 60, 53.5, 60, 55, 68);
    ctx.bezierCurveTo(59, 83, 62, 97, 71, 94);
    ctx.bezierCurveTo(82, 90, 90, 74, 91, 56);
    ctx.bezierCurveTo(93, 30, 80, 6, 50, 6);
    ctx.closePath();
    ctx.fillStyle = color || '#0EA5E9';
    ctx.fill();
    ctx.restore();
    return c.toDataURL('image/png');
  }

  function generatePDF(b) {
    try {
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF({ unit: 'mm', format: 'a4' });
      var W = 210, M = 16;
      var blue = [14, 165, 233];
      var ink = [12, 74, 110];

      /* Header band */
      doc.setFillColor(blue[0], blue[1], blue[2]);
      doc.rect(0, 0, W, 34, 'F');

      /* Watermark */
      try {
        doc.setGState(new doc.GState({ opacity: 0.07 }));
        doc.addImage(toothDataURL('#0EA5E9'), 'PNG', (W - 150) / 2, 92, 150, 150, undefined, 'FAST');
        doc.setGState(new doc.GState({ opacity: 1 }));
      } catch (werr) { /* watermark optional */ }

      /* Header text */
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text(CLINIC_NAME, M + 24, 16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(CLINIC_TAGLINE + '   |   ' + CLINIC_PHONE, M + 24, 24);
      doc.setFontSize(9);
      doc.text('www.smilecare.example', W - M, 16, { align: 'right' });
      doc.text('Mon\u2013Sun  10:00 AM \u2013 8:00 PM', W - M, 24, { align: 'right' });

      /* Small tooth logo in header */
      try { doc.addImage(toothDataURL('#FFFFFF'), 'PNG', M - 2, 7, 20, 20, undefined, 'FAST'); } catch (e) {}

      /* Title */
      doc.setTextColor(ink[0], ink[1], ink[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.text('Appointment Confirmation', M, 50);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text('Thank you for booking with us. Please keep this slip for your visit.', M, 57);

      /* Booking id + token boxes */
      var boxY = 64, boxH = 18, gap = 5;
      var boxW = (W - M * 2 - gap) / 2;
      doc.setFillColor(240, 249, 255);
      doc.setDrawColor(186, 230, 253);
      doc.roundedRect(M, boxY, boxW, boxH, 2, 2, 'FD');
      doc.roundedRect(M + boxW + gap, boxY, boxW, boxH, 2, 2, 'FD');

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('BOOKING ID', M + 4, boxY + 6);
      doc.text('TOKEN NUMBER', M + boxW + gap + 4, boxY + 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(ink[0], ink[1], ink[2]);
      doc.text(b.id, M + 4, boxY + 14);

      doc.setTextColor(217, 119, 6);
      doc.text('#' + b.token, M + boxW + gap + 4, boxY + 14);

      /* Detail rows */
      var rows = [
        ['Patient Name', b.name],
        ['Age', b.age + ' years'],
        ['Mobile Number', '+91 ' + b.mobile],
        ['Service', b.service.name],
        ['Appointment Date', b.dateLong],
        ['Appointment Time', b.time12],
        ['Estimated Fee', money(b.service.price) + ' (indicative)']
      ];

      var y = boxY + boxH + 12;
      var labelX = M + 2, valueX = 74;

      /* Section heading */
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(ink[0], ink[1], ink[2]);
      doc.text('Patient & Appointment Details', M, y);
      y += 3;
      doc.setDrawColor(226, 232, 240);
      doc.line(M, y, W - M, y);
      y += 8;

      doc.setFontSize(10.5);
      rows.forEach(function (r, i) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(r[0], labelX, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(doc.splitTextToSize(r[1], W - M - valueX)[0], valueX, y);
        if (i % 2 === 1) { doc.setDrawColor(241, 245, 249); doc.line(M, y + 3, W - M, y + 3); }
        y += 10;
      });

      /* Address (multi-line) */
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Address', labelX, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      var addrLines = doc.splitTextToSize(b.address, W - M - valueX);
      addrLines.forEach(function (ln, idx) { doc.text(ln, valueX, y + idx * 5.5); });
      y += Math.max(addrLines.length * 5.5, 6) + 6;

      /* Status note */
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(251, 191, 36);
      doc.roundedRect(M, y, W - M * 2, 20, 2, 2, 'FD');
      doc.setTextColor(146, 103, 10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Status: Pending WhatsApp confirmation', M + 4, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Your appointment is final once the clinic confirms on WhatsApp (' + CLINIC_PHONE + ').', M + 4, y + 14);
      y += 28;

      /* Footer */
      doc.setDrawColor(226, 232, 240);
      doc.line(M, y, W - M, y);
      y += 6;
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text('This is a computer-generated appointment confirmation and does not require a signature.', M, y);
      y += 5;
      doc.text('Generated on ' + new Date().toLocaleString('en-IN'), M, y);
      doc.text('SmileCare Dental Clinic', W - M, y, { align: 'right' });

      doc.save('SmileCare-Appointment-' + b.id + '.pdf');
      showToast('Appointment PDF downloaded.');
    } catch (err) {
      console.error(err);
      showToast('Could not generate the PDF. Please try again.');
    }
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    var items = $$('[data-reveal]');
    if (!items.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('reveal-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Header / nav / scroll behaviors ---------- */
  function initNavBehaviors() {
    var menuToggle = $('#menuToggle');
    var mobileNav = $('#mobileNav');
    var header = $('.site-header');
    var progress = $('#scrollProgress');
    var spyLinks = {};
    $$('.site-nav a').forEach(function (l) { spyLinks[l.getAttribute('href')] = l; });
    var spyOrder = ['#services', '#how', '#reviews', '#contact'];

    function setMenu(open) {
      if (!menuToggle || !mobileNav) return;
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      mobileNav.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      if (open) {
        var first = mobileNav.querySelector('a');
        menuOpenFocus = document.activeElement;
        if (first) first.focus();
      } else if (menuOpenFocus && menuOpenFocus.focus) {
        menuOpenFocus.focus();
      }
    }

    if (menuToggle && mobileNav) {
      menuToggle.addEventListener('click', function () {
        setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
      });
      mobileNav.addEventListener('click', function (e) {
        if (e.target && e.target.closest && e.target.closest('a')) setMenu(false);
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuToggle && menuToggle.getAttribute('aria-expanded') === 'true') setMenu(false);
    });

    var ticking = false;
    function onScroll() {
      ticking = false;
      var st = window.pageYOffset || document.documentElement.scrollTop;
      if (header) header.classList.toggle('scrolled', st > 8);
      if (progress) {
        var doc = document.documentElement;
        var max = Math.max(doc.scrollHeight - window.innerHeight, 1);
        progress.style.transform = 'scaleX(' + Math.min(st / max, 1) + ')';
      }
      var current = null;
      for (var i = 0; i < spyOrder.length; i++) {
        var sec = $(spyOrder[i]);
        if (sec && sec.offsetTop - 140 <= st) current = spyOrder[i];
      }
      if (current) Object.keys(spyLinks).forEach(function (h) {
        spyLinks[h].classList.toggle('is-active', h === current);
        if (h === current) spyLinks[h].setAttribute('aria-current', 'location');
        else spyLinks[h].removeAttribute('aria-current');
      });
    }
    function requestTick() { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }
    window.addEventListener('scroll', requestTick, { passive: true });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 760 && menuToggle && menuToggle.getAttribute('aria-expanded') === 'true') setMenu(false);
    });
  }

  var menuOpenFocus = null;

  /* ---------- Hero stat counters ---------- */
  function runCounter(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var dec = target % 1 !== 0 ? 1 : 0;
    var dur = 1300;
    var t0 = performance.now();
    function frame(now) {
      var p = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      var str = dec ? (target * e).toFixed(dec) : Math.round(target * e).toLocaleString('en-IN');
      el.textContent = str + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function initCounters() {
    var els = $$('[data-count]');
    if (!els.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        runCounter(entry.target);
      });
    }, { rootMargin: '0px 0px -5% 0px', threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Service card cursor spotlight ---------- */
  function initCardSpotlight() {
    var grid = $('#servicesGrid');
    if (!grid) return;
    grid.addEventListener('pointermove', function (e) {
      var card = e.target.closest ? e.target.closest('.service-card') : null;
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left).toFixed(1) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top).toFixed(1) + 'px');
    });
  }

  /* ---------- Init ---------- */
  function init() {
    renderServices();
    renderServiceOptions();
    goToStep(1);
    updateSummary();
    initReveal();
    initNavBehaviors();
    initCounters();
    initCardSpotlight();
    var yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
