const STORAGE_KEY = "services_web_clients_v1";
const EQUIPMENT_STORAGE_KEY = "services_web_equipment_v1";
const PRODUCTS_STORAGE_KEY = "services_web_products_v1";
const SERVICES_STORAGE_KEY = "services_web_services_v1";
const SETTINGS_STORAGE_KEY = "services_web_settings_v1";
const PATTERN_SIZE = 230;
const SERVICE_DELAY_STATUSES = {
  review: "Revision demorada",
  pickup: "Retiro demorado",
};

const state = {
  clients: loadClients(),
  equipment: loadEquipment(),
  products: loadProducts(),
  services: loadServices(),
  settings: loadSettings(),
  editingId: null,
  editingEquipmentId: null,
  editingProductId: null,
  editingServiceId: null,
  pattern: [],
  serviceWorks: [],
  serviceParts: [],
  serviceIssues: [],
  externalWorks: [],
  actionMenuRecord: null,
  serviceHistoryFilter: null,
  toastTimers: new Map(),
  serviceDelayPromptShown: false,
  remoteEnabled: false,
  currentUser: null,
  adminUser: null,
  impersonating: false,
  csrfToken: "",
  provinces: [],
  cities: [],
  offlineGeo: false,
};

const els = {
  title: document.querySelector("#view-title"),
  navItems: [...document.querySelectorAll(".nav-item[data-view]")],
  logoutButton: document.querySelector("#logout-button"),
  adminPanelButton: document.querySelector("#admin-panel-button"),
  impersonationBanner: document.querySelector("#impersonation-banner"),
  impersonationText: document.querySelector("#impersonation-text"),
  stopImpersonation: document.querySelector("#stop-impersonation"),
  homeView: document.querySelector("#home-view"),
  clientsView: document.querySelector("#clients-view"),
  equipmentView: document.querySelector("#equipment-view"),
  productsView: document.querySelector("#products-view"),
  servicesView: document.querySelector("#services-view"),
  settingsView: document.querySelector("#settings-view"),
  quickAction: document.querySelector("#quick-action"),
  search: document.querySelector("#client-search"),
  equipmentSearch: document.querySelector("#equipment-search"),
  productSearch: document.querySelector("#product-search"),
  serviceSearch: document.querySelector("#service-search"),
  filterAll: document.querySelector("#filter-all"),
  serviceFilters: [...document.querySelectorAll(".service-filter")],
  statusFilterCards: [...document.querySelectorAll("[data-status-filter]")],
  tbody: document.querySelector("#clients-body"),
  equipmentBody: document.querySelector("#equipment-body"),
  productsBody: document.querySelector("#products-body"),
  servicesBody: document.querySelector("#services-body"),
  toastStack: document.querySelector("#toast-stack"),
  serviceActionMenu: document.querySelector("#service-action-menu"),
  serviceHistoryFilter: document.querySelector("#service-history-filter"),
  serviceHistoryFilterText: document.querySelector("#service-history-filter-text"),
  clearServiceHistoryFilter: document.querySelector("#clear-service-history-filter"),
  empty: document.querySelector("#empty-clients"),
  emptyEquipment: document.querySelector("#empty-equipment"),
  emptyProducts: document.querySelector("#empty-products"),
  emptyServices: document.querySelector("#empty-services"),
  metricClients: document.querySelector("#metric-clients"),
  metricEquipment: document.querySelector("#metric-equipment"),
  metricOpenServices: document.querySelector("#metric-open-services"),
  statusCounts: {
    sinRevisar: document.querySelector("#status-sin-revisar-count"),
    revisado: document.querySelector("#status-revisado-count"),
    revisionDemorada: document.querySelector("#status-revision-demorada-count"),
    retiroDemorado: document.querySelector("#status-retiro-demorado-count"),
    entregado: document.querySelector("#status-entregado-count"),
    cancelado: document.querySelector("#status-cancelado-count"),
  },
  activity: document.querySelector("#activity-list"),
  activityTemplate: document.querySelector("#activity-template"),
  dialog: document.querySelector("#client-dialog"),
  form: document.querySelector("#client-form"),
  dialogTitle: document.querySelector("#dialog-title"),
  closeDialog: document.querySelector("#close-dialog"),
  cancelDialog: document.querySelector("#cancel-dialog"),
  error: document.querySelector("#form-error"),
  fields: {
    name: document.querySelector("#client-name"),
    document: document.querySelector("#client-document"),
    province: document.querySelector("#client-province"),
    city: document.querySelector("#client-city"),
    address: document.querySelector("#client-address"),
    phone1: document.querySelector("#client-phone1"),
    phone2: document.querySelector("#client-phone2"),
    comments: document.querySelector("#client-comments"),
  },
  provinceList: document.querySelector("#province-list"),
  cityList: document.querySelector("#city-list"),
  equipmentDialog: document.querySelector("#equipment-dialog"),
  equipmentForm: document.querySelector("#equipment-form"),
  equipmentDialogTitle: document.querySelector("#equipment-dialog-title"),
  closeEquipmentDialog: document.querySelector("#close-equipment-dialog"),
  cancelEquipmentDialog: document.querySelector("#cancel-equipment-dialog"),
  equipmentError: document.querySelector("#equipment-form-error"),
  equipmentFields: {
    client: document.querySelector("#equipment-client"),
    clientId: document.querySelector("#equipment-client-id"),
    type: document.querySelector("#equipment-type"),
    otherType: document.querySelector("#equipment-other-type"),
    brand: document.querySelector("#equipment-brand"),
    model: document.querySelector("#equipment-model"),
    serial: document.querySelector("#equipment-serial"),
    condition: document.querySelector("#equipment-condition"),
    password: document.querySelector("#equipment-password"),
  },
  equipmentClientMenu: document.querySelector("#equipment-client-menu"),
  equipmentTypeTrigger: document.querySelector("#equipment-type-trigger"),
  equipmentTypeMenu: document.querySelector("#equipment-type-menu"),
  equipmentBrandMenu: document.querySelector("#equipment-brand-menu"),
  equipmentModelMenu: document.querySelector("#equipment-model-menu"),
  equipmentClientWrap: document.querySelector("#equipment-client-wrap"),
  otherTypeWrap: document.querySelector("#other-type-wrap"),
  passwordWrap: document.querySelector("#password-wrap"),
  patternWrap: document.querySelector("#pattern-wrap"),
  patternGrid: document.querySelector("#pattern-grid"),
  patternLines: document.querySelector("#pattern-lines"),
  clearPattern: document.querySelector("#clear-pattern"),
  productDialog: document.querySelector("#product-dialog"),
  productForm: document.querySelector("#product-form"),
  productDialogTitle: document.querySelector("#product-dialog-title"),
  closeProductDialog: document.querySelector("#close-product-dialog"),
  cancelProductDialog: document.querySelector("#cancel-product-dialog"),
  productError: document.querySelector("#product-form-error"),
  productTypeMenu: document.querySelector("#product-type-menu"),
  productBrandMenu: document.querySelector("#product-brand-menu"),
  productModelMenu: document.querySelector("#product-model-menu"),
  productFields: {
    type: document.querySelector("#product-type"),
    brand: document.querySelector("#product-brand"),
    model: document.querySelector("#product-model"),
    cost: document.querySelector("#product-cost"),
    margin: document.querySelector("#product-margin"),
    finalPrice: document.querySelector("#product-final-price"),
    features: document.querySelector("#product-features"),
  },
  serviceDialog: document.querySelector("#service-dialog"),
  serviceForm: document.querySelector("#service-form"),
  serviceDialogTitle: document.querySelector("#service-dialog-title"),
  closeServiceDialog: document.querySelector("#close-service-dialog"),
  cancelServiceDialog: document.querySelector("#cancel-service-dialog"),
  serviceError: document.querySelector("#service-form-error"),
  serviceClientList: document.querySelector("#service-client-list"),
  serviceClientMenu: document.querySelector("#service-client-menu"),
  serviceWorksBody: document.querySelector("#service-works-body"),
  servicePartsBody: document.querySelector("#service-parts-body"),
  serviceSummaryBody: document.querySelector("#service-summary-body"),
  serviceIssuesBody: document.querySelector("#service-issues-body"),
  requestedWorksBody: document.querySelector("#requested-works-body"),
  externalWorksBody: document.querySelector("#external-works-body"),
  addWork: document.querySelector("#add-work"),
  addPart: document.querySelector("#add-part"),
  addIssue: document.querySelector("#add-issue"),
  addRequestedWork: document.querySelector("#add-requested-work"),
  addExternalWork: document.querySelector("#add-external-work"),
  quickNewClient: document.querySelector("#quick-new-client"),
  quickNewEquipment: document.querySelector("#quick-new-equipment"),
  quickEditClient: document.querySelector("#quick-edit-client"),
  quickEditEquipment: document.querySelector("#quick-edit-equipment"),
  quickNewPart: document.querySelector("#quick-new-part"),
  quickEditPart: document.querySelector("#quick-edit-part"),
  saveWorkPreset: document.querySelector("#save-work-preset"),
  serviceNoEquipment: document.querySelector("#service-no-equipment"),
  partProductList: document.querySelector("#part-product-list"),
  serviceTotal: document.querySelector("#service-total"),
  frequentWorkList: document.querySelector("#frequent-work-list"),
  serviceFields: {
    client: document.querySelector("#service-client"),
    equipment: document.querySelector("#service-equipment"),
    status: document.querySelector("#service-status"),
    derived: document.querySelector("#service-derived"),
    failure: document.querySelector("#service-failure"),
    diagnosis: document.querySelector("#service-diagnosis"),
    accessories: document.querySelector("#service-accessories"),
    issueDescription: document.querySelector("#issue-description"),
    requestedWorkDescription: document.querySelector("#requested-work-description"),
    workDescription: document.querySelector("#work-description"),
    workPrice: document.querySelector("#work-price"),
    workNote: document.querySelector("#work-note"),
    partProduct: document.querySelector("#part-product"),
    partQuantity: document.querySelector("#part-quantity"),
    externalWork: document.querySelector("#external-work"),
    externalCost: document.querySelector("#external-cost"),
  },
  serviceEquipmentTrigger: document.querySelector("#service-equipment-trigger"),
  serviceEquipmentMenu: document.querySelector("#service-equipment-menu"),
  serviceTabs: [...document.querySelectorAll(".service-tab")],
  serviceTabPanels: [...document.querySelectorAll(".service-tab-panel")],
  settingsFields: {
    transportCost: document.querySelector("#transport-cost"),
    marginType: document.querySelector("#margin-type"),
    marginPercent: document.querySelector("#margin-percent"),
    frequentWorkDescription: document.querySelector("#frequent-work-description"),
    frequentWorkPrice: document.querySelector("#frequent-work-price"),
    reviewDelayAmount: document.querySelector("#service-review-delay-amount"),
    reviewDelayUnit: document.querySelector("#service-review-delay-unit"),
    pickupDelayAmount: document.querySelector("#service-pickup-delay-amount"),
    pickupDelayUnit: document.querySelector("#service-pickup-delay-unit"),
  },
  saveTransport: document.querySelector("#save-transport"),
  saveServiceDelays: document.querySelector("#save-service-delays"),
  addMargin: document.querySelector("#add-margin"),
  addFrequentWork: document.querySelector("#add-frequent-work"),
  deleteOrphanClients: document.querySelector("#delete-orphan-clients"),
  orphanClientsText: document.querySelector("#orphan-clients-text"),
  marginsBody: document.querySelector("#margins-body"),
  frequentWorksBody: document.querySelector("#frequent-works-body"),
  settingsTypeList: document.querySelector("#settings-type-list"),
  messageDialog: document.querySelector("#message-dialog"),
  messageBanner: document.querySelector("#message-banner"),
  messageTitle: document.querySelector("#message-title"),
  messageText: document.querySelector("#message-text"),
  messageIcon: document.querySelector("#message-icon"),
  messageActions: document.querySelector("#message-actions"),
  messageClose: document.querySelector("#message-close"),
};

boot();

async function boot() {
  disableBrowserAutocomplete();
  wireEvents();
  renderEquipmentTypePicker();
  await initializeRemoteState();
  renderAll();
  decorateActionButtons();
  loadProvinces();
  window.setTimeout(checkServiceDelayAlerts, 400);
}

function disableBrowserAutocomplete() {
  document.querySelectorAll("form, input, textarea, select").forEach((field) => {
    field.setAttribute("autocomplete", "off");
  });
}

function ensureDemoData() {
  const clientNames = [
    ["Ana Rodriguez", "Buenos Aires", "La Plata", "Calle 12 845", "221 555-1101", "30.456.789"],
    ["Carlos Pereira", "Cordoba", "Cordoba", "Av. Colon 1200", "351 555-2212", "28.345.678"],
    ["Lucia Fernandez", "Santa Fe", "Rosario", "San Martin 980", "341 555-3323", "33.222.111"],
    ["Miguel Torres", "Mendoza", "Mendoza", "Las Heras 450", "261 555-4434", "20-30111222-3"],
    ["Sofia Martinez", "Tucuman", "San Miguel de Tucuman", "Rivadavia 776", "381 555-5545", "37.654.321"],
    ["Javier Acosta", "Salta", "Salta", "Belgrano 210", "387 555-6656", "31.987.654"],
    ["Paula Gimenez", "Neuquen", "Neuquen", "Argentina 650", "299 555-7767", "29.876.543"],
    ["Diego Molina", "Rio Negro", "General Roca", "Italia 332", "298 555-8878", "27.765.432"],
    ["Valeria Suarez", "Chaco", "Resistencia", "Mitre 1010", "362 555-9989", "34.111.222"],
    ["Nicolas Romero", "Misiones", "Posadas", "Bolivar 505", "376 555-1090", "32.444.555"],
  ];

  while (state.clients.length < 10) {
    const demo = clientNames[state.clients.length % clientNames.length];
    state.clients.push({
      id: nextClientId(),
      name: demo[0],
      province: demo[1],
      city: demo[2],
      address: demo[3],
      phone1: demo[4],
      phone2: "",
      document: demo[5],
      comments: "Cliente de prueba para revisar el sistema.",
      createdAt: new Date().toISOString(),
    });
  }

  const equipmentModels = [
    ["Telefono", "Samsung", "A32", "RF8R-A32-001", "Pantalla marcada", "1234", "0-1-2"],
    ["Notebook", "Lenovo", "IdeaPad 3", "LN-IP3-002", "Bisagra floja", "cliente2026", ""],
    ["CPU / PC", "Intel", "Core i5", "PC-I5-003", "No enciende", "admin", ""],
    ["Tablet", "Samsung", "Tab A7", "TB-A7-004", "Vidrio astillado", "2580", "0-4-8"],
    ["Monitor", "LG", "24MK430", "LG-MON-005", "Sin imagen", "", ""],
    ["Impresora", "Epson", "L3150", "EP-L3150-006", "No toma papel", "", ""],
    ["Telefono", "Motorola", "G9 Plus", "MOT-G9-007", "Pin de carga flojo", "9876", "2-4-6"],
    ["Notebook", "HP", "Pavilion 15", "HP-P15-008", "Lenta", "hp2026", ""],
    ["Telefono", "Xiaomi", "Redmi Note 10", "XM-RN10-009", "Bateria hinchada", "1122", "6-7-8"],
    ["Tablet", "Lenovo", "M10", "LEN-M10-010", "No carga", "0000", "1-4-7"],
  ];

  while (state.equipment.length < 10) {
    const index = state.equipment.length % equipmentModels.length;
    const demo = equipmentModels[index];
    const client = state.clients[index % state.clients.length];
    state.equipment.push({
      id: nextEquipmentId(),
      clientId: client.id,
      type: demo[0],
      brand: demo[1],
      model: demo[2],
      serial: demo[3],
      condition: demo[4],
      password: demo[5],
      pattern: demo[6],
      createdAt: new Date().toISOString(),
    });
  }

  const failures = [
    ["No carga correctamente", "Cambio de pin de carga recomendado", "Cargador"],
    ["Equipo lento", "Limpieza y optimizacion de sistema", "Bolso"],
    ["No enciende", "Fuente en revision", "Cable power"],
    ["Pantalla rota", "Cambio de modulo completo", "Funda"],
    ["Sin imagen", "Prueba de fuente y placa main", "Cable HDMI"],
    ["No toma papel", "Limpieza de rodillos", "Cable USB"],
    ["Bateria no dura", "Cambio de bateria sugerido", "Sin accesorios"],
    ["Teclado falla", "Revision de flex y teclado", "Cargador"],
    ["Microfono no funciona", "Revision de placa inferior", "Funda"],
    ["Se reinicia solo", "Diagnostico pendiente", "Cargador"],
  ];
  const statuses = ["Sin revisar", "Revisado", "Entregado", "Cancelado"];

  while (state.services.length < 10) {
    const index = state.services.length % failures.length;
    const equipment = state.equipment[index % state.equipment.length];
    const product = state.products[index % state.products.length];
    const status = statuses[index % statuses.length];
    const entryDate = new Date(Date.now() - index * 86400000).toISOString();
    const finishDate = ["Revisado", "Entregado"].includes(status) ? new Date(Date.now() - index * 43200000).toISOString() : "";
    const deliveryDate = status === "Entregado" ? new Date().toISOString() : "";
    const workPrice = 3500 + index * 600;
    const partPrice = product ? productFinalPrice(product) : 0;

    state.services.push({
      id: nextServiceId(),
      clientId: equipment.clientId,
      equipmentId: equipment.id,
      status,
      entryDate,
      finishDate,
      deliveryDate,
      failure: failures[index][0],
      diagnosis: failures[index][1],
      accessories: failures[index][2],
      derived: index === 2 ? "Electronica externa" : "",
      externalWork: index === 2 ? "Revision de fuente" : "",
      externalCost: index === 2 ? 8000 : 0,
      works: [{ description: index % 2 === 0 ? "Revision inicial" : "Mano de obra tecnica", price: workPrice }],
      parts: product ? [{ productId: product.id, quantity: 1 + (index % 2), salePrice: partPrice }] : [],
      total: workPrice + partPrice * (1 + (index % 2)) + (index === 2 ? 8000 : 0),
    });
  }

  persistClients();
  persistEquipment();
  persistServices();
}

function wireEvents() {
  els.navItems.forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });
  els.logoutButton?.addEventListener("click", logout);
  els.adminPanelButton?.addEventListener("click", () => {
    window.location.href = "/admin";
  });
  els.stopImpersonation?.addEventListener("click", stopImpersonation);

  document.querySelectorAll("[data-view-link]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.viewLink));
  });

  els.quickAction.addEventListener("click", handleQuickAction);
  els.search.addEventListener("input", renderClients);
  els.equipmentSearch.addEventListener("input", renderEquipment);
  els.productSearch.addEventListener("input", renderProducts);
  els.serviceSearch.addEventListener("input", renderServices);
  els.clearServiceHistoryFilter.addEventListener("click", clearServiceHistoryFilter);
  els.filterAll.addEventListener("change", handleFilterAll);
  els.serviceFilters.forEach((filter) => filter.addEventListener("change", handleFilterOne));
  els.statusFilterCards.forEach((card) => {
    card.addEventListener("click", () => applyServiceStatusFilter(card.dataset.statusFilter));
  });
  els.closeDialog.addEventListener("click", closeClientDialog);
  els.cancelDialog.addEventListener("click", closeClientDialog);
  els.form.addEventListener("submit", saveClient);
  els.closeEquipmentDialog.addEventListener("click", closeEquipmentDialog);
  els.cancelEquipmentDialog.addEventListener("click", closeEquipmentDialog);
  els.equipmentForm.addEventListener("submit", saveEquipment);
  els.productForm.addEventListener("submit", saveProduct);
  els.closeProductDialog.addEventListener("click", closeProductDialog);
  els.cancelProductDialog.addEventListener("click", closeProductDialog);
  els.productFields.type.addEventListener("input", () => {
    refreshProductTypeMenu(false);
    updateProductSuggestions();
    fillProductMarginFromType();
  });
  els.productFields.type.addEventListener("focus", () => refreshProductTypeMenu(false));
  els.productFields.type.addEventListener("click", () => refreshProductTypeMenu(false));
  els.productFields.type.addEventListener("keydown", handleProductTypeKeydown);
  els.productFields.brand.addEventListener("input", () => {
    refreshProductBrandMenu(false);
    updateProductSuggestions();
  });
  els.productFields.brand.addEventListener("focus", () => refreshProductBrandMenu(false));
  els.productFields.brand.addEventListener("click", () => refreshProductBrandMenu(false));
  els.productFields.brand.addEventListener("keydown", (event) => handleSuggestKeydown(event, () => refreshProductBrandMenu(true), hideProductBrandMenu));
  els.productFields.model.addEventListener("input", () => refreshProductModelMenu(false));
  els.productFields.model.addEventListener("focus", () => refreshProductModelMenu(false));
  els.productFields.model.addEventListener("click", () => refreshProductModelMenu(false));
  els.productFields.model.addEventListener("keydown", (event) => handleSuggestKeydown(event, () => refreshProductModelMenu(true), hideProductModelMenu));
  els.productFields.cost.addEventListener("input", refreshProductFinalPrice);
  els.productFields.margin.addEventListener("input", refreshProductFinalPrice);
  els.serviceForm.addEventListener("submit", saveService);
  els.closeServiceDialog.addEventListener("click", closeServiceDialog);
  els.cancelServiceDialog.addEventListener("click", closeServiceDialog);
  els.serviceFields.client.addEventListener("input", () => {
    refreshServiceClientMenu(false);
    refreshServiceEquipmentSelect();
  });
  els.serviceFields.client.addEventListener("focus", () => refreshServiceClientMenu(false));
  els.serviceFields.client.addEventListener("click", () => refreshServiceClientMenu(false));
  els.serviceFields.client.addEventListener("keydown", handleServiceClientKeydown);
  bindEnterToButton([els.serviceFields.issueDescription], els.addIssue);
  bindEnterToButton([els.serviceFields.requestedWorkDescription], els.addRequestedWork);
  bindEnterToButton([els.serviceFields.workDescription, els.serviceFields.workPrice, els.serviceFields.workNote], els.addWork);
  bindEnterToButton([els.serviceFields.partProduct, els.serviceFields.partQuantity], els.addPart);
  bindEnterToButton([els.serviceFields.derived, els.serviceFields.externalWork, els.serviceFields.externalCost], els.addExternalWork);
  els.serviceFields.status.addEventListener("change", () => {
    configureServiceTabs(false);
    refreshServiceTotal();
  });
  els.serviceFields.workDescription.addEventListener("input", fillFrequentWorkPrice);
  els.serviceFields.externalCost.addEventListener("input", refreshServiceTotal);
  els.addIssue.addEventListener("click", addServiceIssue);
  els.addRequestedWork.addEventListener("click", addRequestedServiceWork);
  els.addWork.addEventListener("click", addServiceWork);
  els.addPart.addEventListener("click", addServicePart);
  els.addExternalWork.addEventListener("click", addExternalWork);
  els.serviceTabs.forEach((tab) => tab.addEventListener("click", () => showServiceTab(tab.dataset.serviceTab)));
  els.quickNewClient.addEventListener("click", () => openClientDialog());
  els.quickNewEquipment.addEventListener("click", openQuickEquipmentDialog);
  els.quickEditClient.addEventListener("click", openQuickEditClientDialog);
  els.quickEditEquipment.addEventListener("click", openQuickEditEquipmentDialog);
  els.quickNewPart.addEventListener("click", () => openProductDialog());
  els.quickEditPart.addEventListener("click", openQuickEditPartDialog);
  els.saveWorkPreset.addEventListener("click", addCurrentWorkToPreset);
  els.saveTransport.addEventListener("click", saveTransportCost);
  els.saveServiceDelays?.addEventListener("click", saveServiceDelaySettings);
  els.addMargin.addEventListener("click", addMargin);
  els.addFrequentWork.addEventListener("click", addFrequentWork);
  els.deleteOrphanClients?.addEventListener("click", deleteOrphanClients);
  els.messageClose.addEventListener("click", () => closeMessage(false));
  els.serviceActionMenu.addEventListener("click", handleActionMenuClick);
  document.addEventListener("click", closeActionMenu);
  document.addEventListener("click", hideServiceClientMenuOnOutsideClick);
  document.addEventListener("click", hideServiceEquipmentMenuOnOutsideClick);
  document.addEventListener("click", hideEquipmentClientMenuOnOutsideClick);
  document.addEventListener("click", hideProductTypeMenuOnOutsideClick);
  document.addEventListener("click", hideProductBrandMenuOnOutsideClick);
  document.addEventListener("click", hideProductModelMenuOnOutsideClick);
  document.addEventListener("click", hideEquipmentBrandMenuOnOutsideClick);
  document.addEventListener("click", hideEquipmentModelMenuOnOutsideClick);
  document.addEventListener("click", hideEquipmentTypeMenuOnOutsideClick);
  els.equipmentFields.type.addEventListener("change", updateEquipmentVisibility);
  els.equipmentFields.type.addEventListener("change", updateBrandSuggestions);
  els.equipmentFields.type.addEventListener("change", syncEquipmentTypePicker);
  els.equipmentTypeTrigger.addEventListener("click", toggleEquipmentTypeMenu);
  els.equipmentFields.client.addEventListener("input", () => {
    els.equipmentFields.clientId.value = "";
    refreshEquipmentClientMenu(false);
  });
  els.equipmentFields.client.addEventListener("focus", () => refreshEquipmentClientMenu(false));
  els.equipmentFields.client.addEventListener("click", () => refreshEquipmentClientMenu(false));
  els.equipmentFields.client.addEventListener("keydown", handleEquipmentClientKeydown);
  els.equipmentFields.brand.addEventListener("input", () => {
    refreshEquipmentBrandMenu(false);
    updateModelSuggestions();
  });
  els.equipmentFields.brand.addEventListener("focus", () => refreshEquipmentBrandMenu(false));
  els.equipmentFields.brand.addEventListener("click", () => refreshEquipmentBrandMenu(false));
  els.equipmentFields.brand.addEventListener("keydown", (event) => handleSuggestKeydown(event, () => refreshEquipmentBrandMenu(true), hideEquipmentBrandMenu));
  els.equipmentFields.model.addEventListener("input", () => refreshEquipmentModelMenu(false));
  els.equipmentFields.model.addEventListener("focus", () => refreshEquipmentModelMenu(false));
  els.equipmentFields.model.addEventListener("click", () => refreshEquipmentModelMenu(false));
  els.equipmentFields.model.addEventListener("keydown", (event) => handleSuggestKeydown(event, () => refreshEquipmentModelMenu(true), hideEquipmentModelMenu));
  els.serviceEquipmentTrigger.addEventListener("click", toggleServiceEquipmentMenu);
  els.patternGrid.addEventListener("pointerdown", startPatternDraw);
  els.patternGrid.addEventListener("pointermove", continuePatternDraw);
  els.patternGrid.addEventListener("pointerup", endPatternDraw);
  els.patternGrid.addEventListener("pointercancel", endPatternDraw);
  els.patternGrid.addEventListener("pointerleave", continuePatternDraw);
  els.clearPattern.addEventListener("click", () => {
    state.pattern = [];
    renderPattern();
  });

  els.fields.document.addEventListener("input", () => {
    const formatted = formatDniCuit(els.fields.document.value);
    if (formatted !== els.fields.document.value) {
      els.fields.document.value = formatted;
      els.fields.document.setSelectionRange(formatted.length, formatted.length);
    }
  });

  els.fields.province.addEventListener("change", () => loadCities(els.fields.province.value));
  els.fields.province.addEventListener("input", () => {
    els.fields.city.value = "";
    clearDatalist(els.cityList);
  });
}

function bindEnterToButton(fields, button) {
  fields.forEach((field) => {
    field.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      button.click();
    });
  });
}

function isFieldMenuActive(field, menu, showAll = false) {
  if (!field || !menu) return false;
  return showAll || document.activeElement === field || menu.classList.contains("visible");
}

function isEventInsideCombo(event, field, menu, trigger = null) {
  const path = event.composedPath ? event.composedPath() : [];
  const owner = field?.closest("label") || trigger?.closest("label") || menu?.closest("label");
  return [field, menu, trigger, owner].some((element) => (
    element && (path.includes(element) || element.contains?.(event.target))
  ));
}

function keepComboInteraction(event) {
  if (event.type !== "pointerdown") {
    event.preventDefault();
  }
  event.stopPropagation();
}

function focusDialogShell(dialog, ...hideMenus) {
  dialog.setAttribute("tabindex", "-1");
  requestAnimationFrame(() => {
    hideMenus.forEach((hideMenu) => hideMenu?.());
    if (dialog.open) dialog.focus({ preventScroll: true });
  });
}

function showView(view) {
  els.navItems.forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  els.homeView.classList.toggle("active", view === "home");
  els.clientsView.classList.toggle("active", view === "clients");
  els.equipmentView.classList.toggle("active", view === "equipment");
  els.productsView.classList.toggle("active", view === "products");
  els.servicesView.classList.toggle("active", view === "services");
  els.settingsView.classList.toggle("active", view === "settings");

  if (view === "clients") {
    els.title.textContent = "Clientes";
    els.quickAction.innerHTML = "<span>＋</span>Nuevo cliente";
  } else if (view === "equipment") {
    els.title.textContent = "Equipos";
    els.quickAction.innerHTML = "<span>＋</span>Nuevo equipo";
  } else if (view === "products") {
    els.title.textContent = "Productos";
    els.quickAction.innerHTML = "<span>＋</span>Nuevo producto";
  } else if (view === "services") {
    els.title.textContent = "Servicios";
    els.quickAction.innerHTML = "<span>＋</span>Nuevo servicio";
  } else if (view === "settings") {
    els.title.textContent = "Configuracion";
    els.quickAction.innerHTML = "<span>＋</span>Nuevo margen";
  } else {
    els.title.textContent = "Inicio";
    els.quickAction.innerHTML = "<span>＋</span>Nuevo cliente";
  }

}

function showMessage(title, text, type = "info", mode = "ok", choices = []) {
  return new Promise((resolve) => {
    state.messageResolver = resolve;
    els.messageTitle.textContent = title;
    els.messageText.textContent = text;
    els.messageIcon.textContent = type === "error" ? "!" : type === "warning" ? "?" : "✓";
    els.messageBanner.className = `dialog-banner ${type}`;
    els.messageDialog.classList.toggle("choice-dialog", mode === "choices");
    els.messageActions.className = `dialog-actions${mode === "choices" ? " choice-actions" : ""}`;
    els.messageActions.innerHTML = "";

    if (mode === "confirm") {
      const accept = document.createElement("button");
      accept.className = "primary-action";
      accept.type = "button";
      accept.textContent = "Si, continuar";
      accept.addEventListener("click", () => closeMessage(true));

      const cancel = document.createElement("button");
      cancel.className = "danger-button";
      cancel.type = "button";
      cancel.textContent = "Cancelar";
      cancel.addEventListener("click", () => closeMessage(false));

      els.messageActions.append(accept, cancel);
    } else if (mode === "choices") {
      choices.forEach((choice) => {
        const button = document.createElement("button");
        button.className = choice.className || "ghost-button";
        button.type = "button";
        button.textContent = choice.label;
        button.addEventListener("click", () => closeMessage(choice.value));
        els.messageActions.append(button);
      });

      const cancel = document.createElement("button");
      cancel.className = "danger-button";
      cancel.type = "button";
      cancel.textContent = "Cancelar";
      cancel.addEventListener("click", () => closeMessage(null));
      els.messageActions.append(cancel);
    } else {
      const ok = document.createElement("button");
      ok.className = "primary-action";
      ok.type = "button";
      ok.textContent = "Aceptar";
      ok.addEventListener("click", () => closeMessage(true));
      els.messageActions.append(ok);
    }

    if (!els.messageDialog.open) els.messageDialog.showModal();
  });
}

function closeMessage(result) {
  if (els.messageDialog.open) els.messageDialog.close();
  if (state.messageResolver) {
    state.messageResolver(result);
    state.messageResolver = null;
  }
}

function handleQuickAction() {
  const active = document.querySelector(".nav-item.active")?.dataset.view;
  if (active === "equipment") openEquipmentDialog();
  else if (active === "products") openProductDialog();
  else if (active === "services") openServiceDialog();
  else if (active === "settings") {
    els.settingsFields.marginType.focus();
  }
  else openClientDialog();
}

function currentView() {
  return document.querySelector(".nav-item.active")?.dataset.view || "home";
}

async function logout() {
  if (state.remoteEnabled) {
    try {
      await fetchJson("/api/logout", { method: "POST" });
    } catch {
      // Salimos igual: si la sesion ya vencio, volver al login es lo correcto.
    }
    window.location.href = "/";
    return;
  }
  window.location.href = "login.html";
}

async function stopImpersonation() {
  if (!state.remoteEnabled) return;
  try {
    await fetchJson("/api/admin/stop-impersonation", { method: "POST" });
    window.location.href = "/admin";
  } catch (error) {
    showToast(error.message || "No se pudo volver al administrador");
  }
}

async function initializeRemoteState() {
  if (location.protocol === "file:") return;

  try {
    const session = await fetchJson("/api/me");
    if (!session.authenticated) {
      window.location.href = "/";
      return;
    }

    const remote = await fetchJson("/api/state");
    state.remoteEnabled = true;
    state.currentUser = session.user;
    state.adminUser = session.admin;
    state.impersonating = Boolean(session.impersonating);
    state.csrfToken = session.csrfToken || "";
    state.clients = Array.isArray(remote.clients) ? remote.clients : [];
    state.equipment = Array.isArray(remote.equipment) ? remote.equipment : [];
    state.products = Array.isArray(remote.products) ? remote.products : [];
    state.services = Array.isArray(remote.services) ? remote.services : [];
    state.settings = normalizeSettings(remote.settings);
  } catch {
    state.remoteEnabled = false;
  }
}

async function fetchJson(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(method !== "GET" && state.csrfToken ? { "X-CSRF-Token": state.csrfToken } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Error de comunicacion.");
  return data;
}

function normalizeSettings(settings = {}) {
  return {
    transportCost: Number(settings.transportCost || 0),
    margins: Array.isArray(settings.margins) ? settings.margins : [],
    frequentWorks: Array.isArray(settings.frequentWorks) ? settings.frequentWorks : [],
    serviceFilters: settings.serviceFilters || { all: true, statuses: [] },
    serviceDelays: normalizeServiceDelays(settings.serviceDelays),
    serviceDelayReminders: normalizeServiceDelayReminders(settings.serviceDelayReminders),
  };
}

function normalizeServiceDelays(delays = {}) {
  const review = delays.review || {};
  const pickup = delays.pickup || {};
  return {
    review: {
      amount: Math.max(0, Number(review.amount || 0)),
      unit: review.unit === "months" ? "months" : "days",
    },
    pickup: {
      amount: Math.max(0, Number(pickup.amount || 0)),
      unit: pickup.unit === "months" ? "months" : "days",
    },
  };
}

function normalizeServiceDelayReminders(reminders = {}) {
  if (!reminders || typeof reminders !== "object") return {};
  return Object.fromEntries(
    Object.entries(reminders)
      .filter(([, value]) => value === "never" || Number.isFinite(new Date(value).getTime()))
      .map(([key, value]) => [String(key), value])
  );
}

function loadClients() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return [];
}

function loadEquipment() {
  const stored = localStorage.getItem(EQUIPMENT_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(EQUIPMENT_STORAGE_KEY);
    }
  }

  return [];
}

function loadProducts() {
  const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(PRODUCTS_STORAGE_KEY);
    }
  }

  return [];
}

function loadServices() {
  const stored = localStorage.getItem(SERVICES_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(SERVICES_STORAGE_KEY);
    }
  }

  return [];
}

function loadSettings() {
  const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    }
  }

  return {
    transportCost: 0,
    margins: [],
    frequentWorks: [],
    serviceFilters: {
      all: true,
      statuses: [],
    },
    serviceDelays: normalizeServiceDelays(),
    serviceDelayReminders: {},
  };
}

function persistClients() {
  if (state.remoteEnabled) {
    persistRemote("clients", state.clients);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.clients));
}

function persistEquipment() {
  if (state.remoteEnabled) {
    persistRemote("equipment", state.equipment);
    return;
  }
  localStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(state.equipment));
}

function persistProducts() {
  if (state.remoteEnabled) {
    persistRemote("products", state.products);
    return;
  }
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(state.products));
}

function persistServices() {
  if (state.remoteEnabled) {
    persistRemote("services", state.services);
    return;
  }
  localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(state.services));
}

function persistSettings() {
  if (state.remoteEnabled) {
    persistRemote("settings", state.settings);
    return;
  }
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state.settings));
}

function persistRemote(bucket, value) {
  fetch(`/api/state/${bucket}`, {
    method: "PUT",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(state.csrfToken ? { "X-CSRF-Token": state.csrfToken } : {}),
    },
    body: JSON.stringify(value),
  }).catch(() => {
    showToast("No se pudo sincronizar con la nube", { type: "error" });
  });
}

function renderAll() {
  renderAdminAccess();
  renderMetrics();
  renderClients();
  renderEquipment();
  renderProducts();
  renderServiceFilterControls();
  renderServiceHistoryFilter();
  renderServices();
  renderSettings();
  renderActivity();
  refreshServiceClientDatalist();
  refreshPartProductDatalist();
  refreshFrequentWorkDatalist();
  decorateActionButtons();
}

function renderAdminAccess() {
  els.adminPanelButton?.classList.toggle("hidden", !state.currentUser?.isAdmin && !state.adminUser?.isAdmin);
  els.impersonationBanner?.classList.toggle("hidden", !state.impersonating);
  if (state.impersonating && els.impersonationText) {
    els.impersonationText.textContent = `Viendo sistema de ${state.currentUser?.name || "usuario"} como administrador`;
  }
}

function showToast(message, options = {}) {
  const toast = document.createElement("div");
  toast.className = `toast ${options.type || "success"}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  if (options.actionLabel && typeof options.onAction === "function") {
    const action = document.createElement("button");
    action.type = "button";
    action.textContent = options.actionLabel;
    action.addEventListener("click", () => {
      options.onAction();
      removeToast(toast);
    });
    toast.appendChild(action);
  }
  els.toastStack.appendChild(toast);
  const timer = window.setTimeout(() => removeToast(toast), options.duration || 4200);
  state.toastTimers.set(toast, timer);
}

function removeToast(toast) {
  const timer = state.toastTimers.get(toast);
  if (timer) window.clearTimeout(timer);
  state.toastTimers.delete(toast);
  toast.classList.add("hiding");
  window.setTimeout(() => toast.remove(), 180);
}

function snapshotData() {
  return {
    clients: structuredClone(state.clients),
    equipment: structuredClone(state.equipment),
    products: structuredClone(state.products),
    services: structuredClone(state.services),
  };
}

function restoreSnapshot(snapshot) {
  state.clients = structuredClone(snapshot.clients);
  state.equipment = structuredClone(snapshot.equipment);
  state.products = structuredClone(snapshot.products);
  state.services = structuredClone(snapshot.services);
  persistClients();
  persistEquipment();
  persistProducts();
  persistServices();
  state.selectedRow = null;
  renderAll();
  showToast("Eliminacion deshecha");
}

function decorateActionButtons(root = document) {
  const icons = [
    ["Nuevo", "nuevo.svg"],
    ["Agregar", "nuevo.svg"],
    ["Guardar", "aceptar.svg"],
    ["Aceptar", "aceptar.svg"],
    ["Editar", "editar.svg"],
    ["Borrar", "eliminar.svg"],
    ["Eliminar", "eliminar.svg"],
    ["Quitar", "eliminar.svg"],
    ["Cancelar", "cancelar.svg"],
    ["Limpiar", "cancelar.svg"],
    ["Finalizar", "aceptar.svg"],
    ["Entregar", "entregar.svg"],
    ["Marcar", "aceptar.svg"],
    ["Historial cliente", "clientes.svg"],
    ["Historial equipo", "equipos.svg"],
    ["Ver clientes", "flecha.png"],
    ["Si, continuar", "aceptar.svg"],
  ];

  root.querySelectorAll("button").forEach((button) => {
    if (button.classList.contains("icon-button")) return;
    if (button.closest(".pattern-grid")) return;
    if (button.querySelector(".button-symbol")) return;

    const text = button.textContent.trim();
    const match = icons.find(([label]) => text.startsWith(label));
    if (!match) return;

    button.innerHTML = `<span class="button-symbol" aria-hidden="true"><img src="assets/icons/${match[1]}" alt=""></span>${escapeHtml(text)}`;
  });
}

function renderMetrics() {
  els.metricClients.textContent = String(state.clients.length);
  els.metricEquipment.textContent = String(state.equipment.length);
  els.metricOpenServices.textContent = String(
    state.services.filter((service) => !["Entregado", "Cancelado"].includes(service.status)).length
  );

  els.statusCounts.sinRevisar.textContent = countServicesByStatus("Sin revisar");
  els.statusCounts.revisado.textContent = countServicesByStatus("Revisado");
  els.statusCounts.revisionDemorada.textContent = countServicesByStatus("Revision demorada");
  els.statusCounts.retiroDemorado.textContent = countServicesByStatus("Retiro demorado");
  els.statusCounts.entregado.textContent = countServicesByStatus("Entregado");
  els.statusCounts.cancelado.textContent = countServicesByStatus("Cancelado");
}

function renderActivity() {
  els.activity.innerHTML = "";
  const clientActivity = state.clients.map((client) => ({
    date: client.createdAt,
    text: `Cliente registrado: ${client.name}`,
  }));
  const serviceActivity = state.services.map((service) => {
    const client = getClientById(service.clientId);
    return {
      date: service.entryDate,
      text: `Servicio #${service.id}: ${client?.name || "Sin cliente"} - ${service.status}`,
    };
  });
  const recent = [...clientActivity, ...serviceActivity]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 6);

  if (recent.length === 0) {
    const empty = els.activityTemplate.content.cloneNode(true);
    empty.querySelector("p").textContent = "Todavia no hay actividad cargada.";
    els.activity.appendChild(empty);
    return;
  }

  recent.forEach((client) => {
    const row = els.activityTemplate.content.cloneNode(true);
    row.querySelector("p").textContent = `${formatDateTime(client.date)} · ${client.text}`;
    els.activity.appendChild(row);
  });
}

function renderServices() {
  const query = normalizeSearch(els.serviceSearch.value);
  const allowedStatuses = getAllowedServiceStatuses();
  const filtered = state.services.filter((service) => {
    if (allowedStatuses.length > 0 && !allowedStatuses.includes(service.status)) return false;
    if (state.serviceHistoryFilter?.type === "client" && service.clientId !== state.serviceHistoryFilter.id) return false;
    if (state.serviceHistoryFilter?.type === "equipment" && service.equipmentId !== state.serviceHistoryFilter.id) return false;
    const client = getClientById(service.clientId);
    const equipment = getEquipmentById(service.equipmentId);
    const partsSummary = servicePartsSummary(service);
    const derivationSummary = serviceDerivationSummary(service);
    const text = normalizeSearch(
      [
        service.id,
        service.status,
        client?.name,
        equipmentLabel(equipment),
        service.failure,
        partsSummary,
        derivationSummary,
        service.diagnosis,
        service.accessories,
      ].join(" ")
    );
    return text.includes(query);
  }).sort(compareServicesByStatus);

  els.servicesBody.innerHTML = "";
  filtered.forEach((service) => {
    const client = getClientById(service.clientId);
    const equipment = getEquipmentById(service.equipmentId);
    const failure = service.failure || "---";
    const partsSummary = servicePartsSummary(service);
    const derivationSummary = serviceDerivationSummary(service);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(service.id)}</td>
      <td><span class="status-pill ${statusClass(service.status)}">${escapeHtml(displayServiceStatusLabel(service.status))}</span></td>
      <td class="linked-cell" data-open-client="${escapeHtml(client?.id || "")}" data-tooltip="${escapeHtml(clientTooltip(client))}"><strong>${escapeHtml(client?.name || "Sin cliente")}</strong></td>
      <td class="linked-cell" data-open-equipment="${escapeHtml(equipment?.id || "")}" data-tooltip="${escapeHtml(equipmentTooltip(equipment))}">${deviceLabelHtml(equipment)}</td>
      <td class="tooltip-cell" data-tooltip="${escapeHtml(failure)}"><span class="cell-ellipsis">${escapeHtml(failure)}</span></td>
      <td class="tooltip-cell" data-tooltip="${escapeHtml(partsSummary)}"><span class="cell-ellipsis">${escapeHtml(partsSummary || "---")}</span></td>
      <td class="tooltip-cell" data-tooltip="${escapeHtml(derivationSummary)}"><span class="cell-ellipsis">${escapeHtml(derivationSummary || "---")}</span></td>
      <td>${dateWithAgeHtml(service.entryDate)}</td>
      <td class="tooltip-cell" data-tooltip="${escapeHtml(serviceFinalizedTooltip(service))}">${dateWithAgeHtml(service.finishDate)}</td>
      <td class="tooltip-cell" data-tooltip="${escapeHtml(serviceDeliveredTooltip(service))}">${dateWithAgeHtml(service.deliveryDate)}</td>
      <td><strong>${money(service.total)}</strong></td>
    `;
    markSelectedRow("services", service.id, tr);
    tr.addEventListener("click", () => {
      selectRow("services", service.id, tr);
    });
    tr.addEventListener("contextmenu", (event) => {
      selectRow("services", service.id, tr);
      showActionMenu("services", service.id, event);
    });
    tr.querySelector("[data-open-client] strong")?.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = Number(event.currentTarget.closest("[data-open-client]")?.dataset.openClient);
      if (id) openClientDialog(id);
    });
    tr.querySelector("[data-open-equipment] .device-label")?.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = Number(event.currentTarget.closest("[data-open-equipment]")?.dataset.openEquipment);
      if (id) openEquipmentDialog(id);
    });
    tr.addEventListener("dblclick", () => openServiceDialog(service.id));
    els.servicesBody.appendChild(tr);
  });

  els.emptyServices.classList.toggle("visible", filtered.length === 0);
}

function renderServiceFilterControls() {
  const filters = state.settings.serviceFilters || { all: true, statuses: [] };
  els.filterAll.checked = filters.all !== false;
  els.serviceFilters.forEach((filter) => {
    filter.checked = !els.filterAll.checked && filters.statuses.includes(filter.value);
  });
}

function renderServiceHistoryFilter() {
  const filter = state.serviceHistoryFilter;
  els.serviceHistoryFilter.classList.toggle("hidden", !filter);
  if (!filter) {
    els.serviceHistoryFilterText.textContent = "";
    return;
  }

  if (filter.type === "client") {
    const client = getClientById(filter.id);
    els.serviceHistoryFilterText.textContent = `Historial de cliente: ${client?.name || "Cliente eliminado"}`;
    return;
  }

  const equipment = getEquipmentById(filter.id);
  const client = getClientById(equipment?.clientId);
  els.serviceHistoryFilterText.textContent = `Historial de equipo: ${equipmentLabel(equipment)} - ${client?.name || "Sin cliente"}`;
}

function clearServiceHistoryFilter() {
  state.serviceHistoryFilter = null;
  closeActionMenu();
  renderAll();
}

function actionMenuItems(type, id) {
  const base = [
    { action: "edit", label: "Editar" },
    { action: "delete", label: "Eliminar" },
  ];
  if (type === "clients") return [...base, { action: "client-history", label: "Historial cliente" }];
  if (type === "equipment") return [...base, { action: "equipment-history", label: "Historial equipo" }];
  if (type === "services") {
    const actions = [];
    const service = state.services.find(s => s.id === id);
    if (service) {
      if (["Sin revisar", "Revision demorada"].includes(service.status)) {
        actions.push({ action: "finish-service", label: "Finalizar" });
      } else if (["Revisado", "Retiro demorado"].includes(service.status)) {
        actions.push({ action: "deliver-service", label: "Entregar" });
      }
      if (service.status !== "Cancelado") {
        actions.push({ action: "cancel-service", label: "Cancelar" });
      }
    }
    return [
      ...actions,
      ...base,
      { action: "client-history", label: "Historial cliente" },
      { action: "equipment-history", label: "Historial equipo" },
    ];
  }
  return base;
}

function showActionMenu(type, id, event) {
  if (event.type !== "contextmenu") return;
  event.preventDefault?.();
  event.stopPropagation();
  state.actionMenuRecord = { type, id };
  els.serviceActionMenu.innerHTML = actionMenuItems(type, id)
    .map((item) => `<button type="button" data-action-menu-action="${item.action}">${escapeHtml(item.label)}</button>`)
    .join("");
  decorateActionButtons(els.serviceActionMenu);
  const left = Math.min(event.clientX, window.innerWidth - 235);
  const top = Math.min(event.clientY + 8, window.innerHeight - 190);
  els.serviceActionMenu.style.left = `${Math.max(8, left)}px`;
  els.serviceActionMenu.style.top = `${Math.max(8, top)}px`;
  els.serviceActionMenu.classList.add("visible");
  els.serviceActionMenu.setAttribute("aria-hidden", "false");
}

function closeActionMenu() {
  state.actionMenuRecord = null;
  els.serviceActionMenu.classList.remove("visible");
  els.serviceActionMenu.setAttribute("aria-hidden", "true");
}

async function handleActionMenuClick(event) {
  event.stopPropagation();
  const button = event.target.closest?.("[data-action-menu-action]");
  if (!button) return;

  const record = state.actionMenuRecord;
  if (!record) {
    closeActionMenu();
    return;
  }

  const action = button.dataset.actionMenuAction;
  if (action === "edit") {
    closeActionMenu();
    if (record.type === "clients") openClientDialog(record.id);
    else if (record.type === "equipment") openEquipmentDialog(record.id);
    else if (record.type === "products") openProductDialog(record.id);
    else if (record.type === "services") openServiceDialog(record.id);
  } else if (action === "delete") {
    closeActionMenu();
    if (record.type === "clients") await deleteClient(record.id);
    else if (record.type === "equipment") await deleteEquipment(record.id);
    else if (record.type === "products") await deleteProduct(record.id);
    else if (record.type === "services") await deleteService(record.id);
  } else if (action === "client-history") {
    const clientId = record.type === "clients"
      ? record.id
      : record.type === "services"
        ? state.services.find((service) => service.id === record.id)?.clientId
        : null;
    if (clientId) applyServiceHistoryFilter("client", clientId);
  } else if (action === "equipment-history") {
    const equipmentId = record.type === "equipment"
      ? record.id
      : record.type === "services"
        ? state.services.find((service) => service.id === record.id)?.equipmentId
        : null;
    if (equipmentId) applyServiceHistoryFilter("equipment", equipmentId);
  } else if (action === "finish-service") {
    closeActionMenu();
    openServiceDialog(record.id);
    els.serviceFields.status.value = "Revisado";
    configureServiceTabs(false);
    showServiceTab("service-work-tab");
  } else if (action === "deliver-service") {
    closeActionMenu();
    changeServiceStatus(record.id, "Entregado");
  } else if (action === "cancel-service") {
    closeActionMenu();
    changeServiceStatus(record.id, "Cancelado");
  }
}

function changeServiceStatus(id, newStatus) {
  const previous = state.services.find((s) => s.id === id);
  if (!previous) return;
  const snapshot = snapshotData();
  const dates = nextServiceDates(previous, newStatus);
  state.services = state.services.map((s) =>
    s.id === id ? { ...s, status: newStatus, ...dates } : s
  );
  persistServices();
  state.selectedRow = { type: "services", id };
  keepSavedServiceVisible(id);
  renderAll();
  showToast(`Servicio marcado como ${displayServiceStatusLabel(newStatus)}`, {
    actionLabel: "Deshacer",
    onAction: () => restoreSnapshot(snapshot),
  });
}

async function checkServiceDelayAlerts() {
  if (state.serviceDelayPromptShown) return;
  state.serviceDelayPromptShown = true;

  const delays = normalizeServiceDelays(state.settings.serviceDelays);
  const reviewDays = delayRuleToDays(delays.review);
  const pickupDays = delayRuleToDays(delays.pickup);
  const reviewOverdue = reviewDays > 0
    ? state.services.filter((service) =>
        service.status === "Sin revisar" &&
        serviceAgeDays(service.entryDate) >= reviewDays &&
        shouldShowServiceDelayReminder(service.id, "review")
      )
    : [];
  const pickupOverdue = pickupDays > 0
    ? state.services.filter((service) =>
        service.status === "Revisado" &&
        serviceAgeDays(service.finishDate) >= pickupDays &&
        shouldShowServiceDelayReminder(service.id, "pickup")
      )
    : [];

  if (!reviewOverdue.length && !pickupOverdue.length) return;

  const lines = [];
  if (reviewOverdue.length) {
    lines.push(`${reviewOverdue.length} service(s) siguen sin ver despues del plazo configurado.`);
  }
  if (pickupOverdue.length) {
    lines.push(`${pickupOverdue.length} service(s) finalizados no fueron retirados dentro del plazo configurado.`);
  }
  lines.push("", "Desea marcarlos con estado de demora o recordarlo mas adelante?");

  const choices = [];
  if (reviewOverdue.length) {
    choices.push({ label: "Revision demorada", value: "review", className: "ghost-button" });
  }
  if (pickupOverdue.length) {
    choices.push({ label: "Retiro demorado", value: "pickup", className: "ghost-button" });
  }
  if (reviewOverdue.length && pickupOverdue.length) {
    choices.unshift({ label: "Marcar ambos", value: "all", className: "primary-action" });
  }
  choices.push(
    { label: "Recordar en 1 dia", value: "snooze-1", className: "ghost-button" },
    { label: "Recordar en 7 dias", value: "snooze-7", className: "ghost-button" },
    { label: "Recordar en 15 dias", value: "snooze-15", className: "ghost-button" },
    { label: "Recordar en 30 dias", value: "snooze-30", className: "ghost-button" },
    { label: "No volver a recordar", value: "snooze-never", className: "danger-button" }
  );

  const choice = await showMessage("Services demorados", lines.join("\n"), "warning", "choices", choices);
  if (!choice) return;

  const reviewIds = new Set(reviewOverdue.map((service) => Number(service.id)));
  const pickupIds = new Set(pickupOverdue.map((service) => Number(service.id)));

  if (String(choice).startsWith("snooze-")) {
    snoozeServiceDelayAlerts(choice, reviewIds, pickupIds);
    return;
  }

  const snapshot = snapshotData();
  state.services = state.services.map((service) => {
    if ((choice === "all" || choice === "review") && reviewIds.has(Number(service.id))) {
      return { ...service, status: SERVICE_DELAY_STATUSES.review };
    }
    if ((choice === "all" || choice === "pickup") && pickupIds.has(Number(service.id))) {
      return { ...service, status: SERVICE_DELAY_STATUSES.pickup };
    }
    return service;
  });
  persistServices();
  renderAll();
  showToast("Estados de demora actualizados", {
    actionLabel: "Deshacer",
    onAction: () => restoreSnapshot(snapshot),
  });
}

function snoozeServiceDelayAlerts(choice, reviewIds, pickupIds) {
  state.settings.serviceDelayReminders = normalizeServiceDelayReminders(state.settings.serviceDelayReminders);
  const value = choice === "snooze-never"
    ? "never"
    : new Date(Date.now() + Number(choice.replace("snooze-", "")) * 86400000).toISOString();
  reviewIds.forEach((id) => {
    state.settings.serviceDelayReminders[serviceDelayReminderKey(id, "review")] = value;
  });
  pickupIds.forEach((id) => {
    state.settings.serviceDelayReminders[serviceDelayReminderKey(id, "pickup")] = value;
  });
  persistSettings();
  renderAll();
  showToast(choice === "snooze-never" ? "Recordatorio desactivado" : "Recordatorio pospuesto");
}

function shouldShowServiceDelayReminder(serviceId, type) {
  const reminders = normalizeServiceDelayReminders(state.settings.serviceDelayReminders);
  const value = reminders[serviceDelayReminderKey(serviceId, type)];
  if (!value) return true;
  if (value === "never") return false;
  const remindAt = new Date(value).getTime();
  return Number.isFinite(remindAt) ? Date.now() >= remindAt : true;
}

function serviceDelayReminderKey(serviceId, type) {
  return `${type}:${serviceId}`;
}

function delayRuleToDays(rule = {}) {
  const amount = Math.max(0, Number(rule.amount || 0));
  return rule.unit === "months" ? amount * 30 : amount;
}

function serviceAgeDays(dateValue) {
  if (!dateValue) return 0;
  const time = new Date(dateValue).getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.floor((Date.now() - time) / 86400000);
}

function applyServiceHistoryFilter(type, id) {
  state.serviceHistoryFilter = { type, id };
  state.settings.serviceFilters = { all: true, statuses: [] };
  closeActionMenu();
  persistSettings();
  renderAll();
  showView("services");
}

function handleFilterAll() {
  if (els.filterAll.checked) {
    state.serviceHistoryFilter = null;
    state.settings.serviceFilters = { all: true, statuses: [] };
  } else if (!els.serviceFilters.some((filter) => filter.checked)) {
    els.filterAll.checked = true;
    state.serviceHistoryFilter = null;
    state.settings.serviceFilters = { all: true, statuses: [] };
  }

  persistSettings();
  renderAll();
}

function handleFilterOne() {
  const statuses = els.serviceFilters.filter((filter) => filter.checked).map((filter) => filter.value);
  state.settings.serviceFilters = statuses.length
    ? { all: false, statuses }
    : { all: true, statuses: [] };

  persistSettings();
  renderAll();
}

function applyServiceStatusFilter(status) {
  state.settings.serviceFilters = { all: false, statuses: [status] };
  persistSettings();
  renderAll();
  showView("services");
}

function getAllowedServiceStatuses() {
  const filters = state.settings.serviceFilters || { all: true, statuses: [] };
  return filters.all === false ? filters.statuses : [];
}

function selectRow(type, id, row) {
  document.querySelectorAll("tbody tr.selected-row").forEach((tr) => tr.classList.remove("selected-row"));
  row.classList.add("selected-row");
  state.selectedRow = { type, id };
}

function markSelectedRow(type, id, row) {
  if (state.selectedRow?.type === type && state.selectedRow.id === id) {
    row.classList.add("selected-row");
  }
}

function getSelectedRow() {
  const viewMap = {
    clients: "clients",
    equipment: "equipment",
    products: "products",
    services: "services",
  };
  const view = currentView();
  if (!state.selectedRow || state.selectedRow.type !== viewMap[view]) {
    showMessage("Seleccione un registro", "Haga clic en una fila para editarla o borrarla.", "warning");
    return null;
  }
  return state.selectedRow;
}

function renderSettings() {
  els.settingsFields.transportCost.value = String(state.settings.transportCost || 0);
  const serviceDelays = normalizeServiceDelays(state.settings.serviceDelays);
  if (els.settingsFields.reviewDelayAmount) {
    els.settingsFields.reviewDelayAmount.value = serviceDelays.review.amount ? String(serviceDelays.review.amount) : "";
    els.settingsFields.reviewDelayUnit.value = serviceDelays.review.unit;
    els.settingsFields.pickupDelayAmount.value = serviceDelays.pickup.amount ? String(serviceDelays.pickup.amount) : "";
    els.settingsFields.pickupDelayUnit.value = serviceDelays.pickup.unit;
  }
  const orphanCount = getOrphanClients().length;
  if (els.orphanClientsText) {
    els.orphanClientsText.textContent = orphanCount
      ? `${orphanCount} cliente(s) no tienen equipos ni services asociados.`
      : "No hay clientes sin actividad para eliminar.";
  }
  if (els.deleteOrphanClients) {
    els.deleteOrphanClients.disabled = orphanCount === 0;
  }

  els.marginsBody.innerHTML = "";
  state.settings.margins.forEach((margin, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(margin.type)}</td>
      <td>${Number(margin.percent || 0)} %</td>
      <td><button class="small-button delete" type="button" data-remove-margin="${index}">Quitar</button></td>
    `;
    els.marginsBody.appendChild(tr);
  });

  els.frequentWorksBody.innerHTML = "";
  state.settings.frequentWorks.forEach((work, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(work.description)}</td>
      <td>${money(work.price)}</td>
      <td><button class="small-button delete" type="button" data-remove-frequent-work="${index}">Quitar</button></td>
    `;
    els.frequentWorksBody.appendChild(tr);
  });

  els.marginsBody.querySelectorAll("[data-remove-margin]").forEach((button) => {
    button.addEventListener("click", () => {
      state.settings.margins.splice(Number(button.dataset.removeMargin), 1);
      persistSettings();
      renderAll();
      showToast("Margen quitado");
    });
  });

  els.frequentWorksBody.querySelectorAll("[data-remove-frequent-work]").forEach((button) => {
    button.addEventListener("click", () => {
      state.settings.frequentWorks.splice(Number(button.dataset.removeFrequentWork), 1);
      persistSettings();
      renderAll();
      showToast("Trabajo frecuente quitado");
    });
  });

  refreshSettingsTypeDatalist();
}

function getOrphanClients() {
  const clientsWithEquipment = new Set(state.equipment.map((equipment) => Number(equipment.clientId)));
  const clientsWithServices = new Set(state.services.map((service) => Number(service.clientId)));
  return state.clients.filter((client) =>
    !clientsWithEquipment.has(Number(client.id)) && !clientsWithServices.has(Number(client.id))
  );
}

async function deleteOrphanClients() {
  const orphans = getOrphanClients();
  if (orphans.length === 0) {
    showToast("No hay clientes sin actividad");
    return;
  }

  const confirmed = await showMessage(
    "Eliminar clientes sin actividad",
    `Se eliminaran ${orphans.length} cliente(s) que no tienen equipos ni services asociados.\n\nDesea continuar?`,
    "warning",
    "confirm"
  );
  if (!confirmed) return;

  const snapshot = snapshotData();
  const orphanIds = new Set(orphans.map((client) => Number(client.id)));
  state.clients = state.clients.filter((client) => !orphanIds.has(Number(client.id)));
  persistClients();
  state.selectedRow = null;
  renderAll();
  showToast(`${orphans.length} cliente(s) eliminados`, {
    actionLabel: "Deshacer",
    onAction: () => restoreSnapshot(snapshot),
  });
}

function saveTransportCost() {
  state.settings.transportCost = parseMoney(els.settingsFields.transportCost.value);
  persistSettings();
  renderAll();
  showToast("Costo de transporte actualizado");
}

function saveServiceDelaySettings() {
  state.settings.serviceDelays = normalizeServiceDelays({
    review: {
      amount: parseMoney(els.settingsFields.reviewDelayAmount.value),
      unit: els.settingsFields.reviewDelayUnit.value,
    },
    pickup: {
      amount: parseMoney(els.settingsFields.pickupDelayAmount.value),
      unit: els.settingsFields.pickupDelayUnit.value,
    },
  });
  state.serviceDelayPromptShown = false;
  persistSettings();
  renderAll();
  showToast("Alertas de services actualizadas");
  window.setTimeout(checkServiceDelayAlerts, 200);
}

function addMargin() {
  const type = els.settingsFields.marginType.value.trim();
  const percent = parseMoney(els.settingsFields.marginPercent.value);
  if (!type) return;

  const current = state.settings.margins.find((item) => item.type === type);
  if (current) current.percent = percent;
  else state.settings.margins.push({ type, percent });
  state.products = state.products.map((product) =>
    product.type === type ? { ...product, margin: percent } : product
  );

  els.settingsFields.marginType.value = "";
  els.settingsFields.marginPercent.value = "";
  persistProducts();
  persistSettings();
  renderAll();
  showToast(current ? "Margen actualizado" : "Margen agregado");
}

function addFrequentWork() {
  const description = els.settingsFields.frequentWorkDescription.value.trim();
  const price = parseMoney(els.settingsFields.frequentWorkPrice.value);
  if (!description) return;

  const current = state.settings.frequentWorks.find((item) => item.description === description);
  if (current) current.price = price;
  else state.settings.frequentWorks.push({ description, price });

  els.settingsFields.frequentWorkDescription.value = "";
  els.settingsFields.frequentWorkPrice.value = "";
  persistSettings();
  renderAll();
  showToast(current ? "Trabajo frecuente actualizado" : "Trabajo frecuente agregado");
}

function renderEquipment() {
  const query = normalizeSearch(els.equipmentSearch.value);
  const filtered = state.equipment.filter((equipment) => {
    const client = getClientById(equipment.clientId);
    const text = normalizeSearch(
      [
        equipment.id,
        client?.name,
        equipment.type,
        equipment.brand,
        equipment.model,
        equipment.serial,
        equipment.password,
        equipment.condition,
      ].join(" ")
    );
    return text.includes(query);
  });

  els.equipmentBody.innerHTML = "";
  filtered.forEach((equipment) => {
    const client = getClientById(equipment.clientId);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(equipment.id)}</td>
      <td><strong>${escapeHtml(client?.name || "Sin cliente")}</strong></td>
      <td>${deviceLabelHtml(equipment, { text: equipment.type })}</td>
      <td>${escapeHtml(equipment.brand)}</td>
      <td>${escapeHtml(equipment.model)}</td>
      <td>${escapeHtml(equipment.serial)}</td>
      <td>${escapeHtml(equipment.password || "No disponible")}</td>
      <td>${escapeHtml(equipment.condition)}</td>
    `;
    markSelectedRow("equipment", equipment.id, tr);
    tr.addEventListener("click", () => {
      selectRow("equipment", equipment.id, tr);
    });
    tr.addEventListener("contextmenu", (event) => {
      selectRow("equipment", equipment.id, tr);
      showActionMenu("equipment", equipment.id, event);
    });
    tr.addEventListener("dblclick", () => openEquipmentDialog(equipment.id));
    els.equipmentBody.appendChild(tr);
  });

  els.emptyEquipment.classList.toggle("visible", filtered.length === 0);
}

function renderProducts() {
  const query = normalizeSearch(els.productSearch.value);
  const filtered = state.products.filter((product) => {
    const text = normalizeSearch(
      [product.id, product.type, product.brand, product.model, product.features].join(" ")
    );
    return text.includes(query);
  });

  els.productsBody.innerHTML = "";
  filtered.forEach((product) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(product.id)}</td>
      <td>${escapeHtml(product.type)}</td>
      <td>${escapeHtml(product.brand)}</td>
      <td>${escapeHtml(product.model)}</td>
      <td>${escapeHtml(product.features)}</td>
      <td>${money(product.cost)}</td>
      <td>${Number(productMarginPercent(product) || 0)} %</td>
      <td><strong>${money(productFinalPrice(product))}</strong></td>
    `;
    markSelectedRow("products", product.id, tr);
    tr.addEventListener("click", () => {
      selectRow("products", product.id, tr);
    });
    tr.addEventListener("contextmenu", (event) => {
      selectRow("products", product.id, tr);
      showActionMenu("products", product.id, event);
    });
    tr.addEventListener("dblclick", () => openProductDialog(product.id));
    els.productsBody.appendChild(tr);
  });

  els.emptyProducts.classList.toggle("visible", filtered.length === 0);
}

function openProductDialog(id = null, seed = {}) {
  state.editingProductId = id;
  els.productError.textContent = "";
  els.productForm.reset();
  els.productDialogTitle.textContent = id ? "Editar producto" : "Nuevo producto";
  refreshProductDatalists();

  const product = state.products.find((item) => item.id === id);
  if (product) {
    els.productFields.type.value = product.type;
    els.productFields.brand.value = product.brand;
    els.productFields.model.value = product.model;
    els.productFields.cost.value = product.cost ? String(product.cost) : "";
    els.productFields.margin.value = String(productMarginPercent(product) || "");
    els.productFields.features.value = product.features;
  } else if (seed.type) {
    els.productFields.type.value = seed.type;
    fillProductMarginFromType();
  }

  refreshProductFinalPrice();
  if (!els.productDialog.open) els.productDialog.showModal();
  focusDialogShell(
    els.productDialog,
    hideProductTypeMenu,
    hideProductBrandMenu,
    hideProductModelMenu
  );
}

function closeProductDialog() {
  els.productDialog.close();
}

function saveProduct(event) {
  event.preventDefault();
  els.productError.textContent = "";

  const data = getProductFormData();
  const validation = validateProduct(data);
  if (!validation.ok) {
    els.productError.textContent = validation.message;
    validation.field?.focus();
    return;
  }

  let savedId = state.editingProductId;
  if (state.editingProductId) {
    state.products = state.products.map((product) =>
      product.id === state.editingProductId ? { ...product, ...data } : product
    );
  } else {
    savedId = nextProductId();
    state.products.push({ id: savedId, ...data });
  }

  persistProducts();
  state.selectedRow = { type: "products", id: savedId };
  renderAll();
  showToast(state.editingProductId ? "Producto actualizado" : "Producto agregado");
  if (els.serviceDialog.open) {
    const product = getProductById(savedId);
    if (product) els.serviceFields.partProduct.value = productToOption(product);
  }
  closeProductDialog();
}

function getProductFormData() {
  return {
    type: els.productFields.type.value.trim(),
    brand: els.productFields.brand.value.trim(),
    model: els.productFields.model.value.trim(),
    features: els.productFields.features.value.trim(),
    cost: parseMoney(els.productFields.cost.value),
    margin: parseMoney(els.productFields.margin.value),
  };
}

function validateProduct(data) {
  if (!data.type) {
    return { ok: false, message: "Debe ingresar el tipo de producto.", field: els.productFields.type };
  }
  if (!data.brand) {
    return { ok: false, message: "Debe ingresar la marca.", field: els.productFields.brand };
  }
  if (!data.model) {
    return { ok: false, message: "Debe ingresar el modelo.", field: els.productFields.model };
  }
  if (!els.productFields.cost.value.trim() || data.cost <= 0) {
    return { ok: false, message: "Debe ingresar el costo del producto.", field: els.productFields.cost };
  }
  if (!els.productFields.margin.value.trim() || data.margin <= 0) {
    return { ok: false, message: "Debe ingresar el margen de ganancia.", field: els.productFields.margin };
  }
  return { ok: true };
}

async function deleteProduct(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  const snapshot = snapshotData();

  const used = state.services.some((service) =>
    (service.parts || []).some((part) => part.productId === id)
  );
  if (used) {
    await showMessage("Error al eliminar", "No se puede eliminar este producto porque esta usado como repuesto en servicios.", "error");
    return;
  }

  const confirmed = await showMessage("Confirmar eliminacion", `Eliminar ${productLabel(product)}?\n\nEsta accion no se puede deshacer.`, "warning", "confirm");
  if (!confirmed) return;

  state.products = state.products.filter((item) => item.id !== id);
  persistProducts();
  state.selectedRow = null;
  renderAll();
  showToast("Producto eliminado", { actionLabel: "Deshacer", onAction: () => restoreSnapshot(snapshot) });
}

function refreshProductDatalists() {
  refreshProductTypeMenu(false);
  refreshProductBrandMenu(false);
  refreshProductModelMenu(false);
}

function productTypeOptions() {
  return [...new Set([
    ...state.settings.margins.map((margin) => margin.type),
    ...state.products.map((item) => item.type),
  ])].filter(Boolean).sort();
}

function handleProductTypeKeydown(event) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    refreshProductTypeMenu(true);
  }
  if (event.key === "Escape") {
    hideProductTypeMenu();
  }
}

function refreshProductTypeMenu(showAll = false) {
  if (!els.productTypeMenu) return;
  if (!isFieldMenuActive(els.productFields.type, els.productTypeMenu, showAll)) {
    hideProductTypeMenu();
    return;
  }
  const query = normalizeSearch(els.productFields.type.value);
  const matches = productTypeOptions()
    .filter((type) => showAll || !query || normalizeSearch(type).includes(query))
    .slice(0, 12);

  els.productTypeMenu.innerHTML = matches.map(productTypeMenuButtonHtml).join("");
  els.productTypeMenu.classList.toggle("visible", matches.length > 0);
  els.productTypeMenu.addEventListener("pointerdown", keepComboInteraction);
  els.productTypeMenu.addEventListener("mousedown", keepComboInteraction);
  els.productTypeMenu.querySelectorAll("[data-product-type-option]").forEach((button) => {
    button.addEventListener("pointerdown", keepComboInteraction);
    button.addEventListener("mousedown", keepComboInteraction);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      els.productFields.type.value = button.dataset.productTypeOption;
      hideProductTypeMenu();
      fillProductMarginFromType();
      refreshProductFinalPrice();
      els.productFields.brand.focus();
      refreshProductBrandMenu(true);
    });
  });
}

function productTypeMenuButtonHtml(type) {
  return `
    <button type="button" data-product-type-option="${escapeHtml(type)}">
      <strong>${escapeHtml(type)}</strong>
    </button>
  `;
}

function hideProductTypeMenu() {
  els.productTypeMenu?.classList.remove("visible");
}

function hideProductTypeMenuOnOutsideClick(event) {
  if (!els.productTypeMenu?.classList.contains("visible")) return;
  if (isEventInsideCombo(event, els.productFields.type, els.productTypeMenu)) return;
  hideProductTypeMenu();
}

function handleSuggestKeydown(event, showAll, hide) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    showAll();
  }
  if (event.key === "Escape") {
    hide();
  }
}

function renderSuggestionMenu(menu, items, onPick) {
  menu.innerHTML = items.map((item, index) => `
    <button type="button" data-suggest-index="${index}">
      <strong>${escapeHtml(item.title)}</strong>
    </button>
  `).join("");
  menu.classList.toggle("visible", items.length > 0);
  menu.addEventListener("pointerdown", keepComboInteraction);
  menu.addEventListener("mousedown", keepComboInteraction);
  menu.querySelectorAll("[data-suggest-index]").forEach((button) => {
    button.addEventListener("pointerdown", keepComboInteraction);
    button.addEventListener("mousedown", keepComboInteraction);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      onPick(items[Number(button.dataset.suggestIndex)].value);
    });
  });
}

function productBrandOptions() {
  const type = els.productFields.type.value.trim();
  return [...new Set(
    state.products
      .filter((item) => (!type || item.type === type) && item.brand)
      .map((item) => item.brand)
  )].sort();
}

function productModelOptions() {
  const type = els.productFields.type.value.trim();
  const brand = els.productFields.brand.value.trim();
  return [...new Set(
    state.products
      .filter((item) => (!type || item.type === type) && (!brand || item.brand === brand) && item.model)
      .map((item) => item.model)
  )].sort();
}

function refreshProductBrandMenu(showAll = false) {
  if (!isFieldMenuActive(els.productFields.brand, els.productBrandMenu, showAll)) {
    hideProductBrandMenu();
    return;
  }
  const query = normalizeSearch(els.productFields.brand.value);
  const items = productBrandOptions()
    .filter((brand) => showAll || !query || normalizeSearch(brand).includes(query))
    .slice(0, 12)
    .map((brand) => ({
      value: brand,
      title: brand,
      detail: `${state.products.filter((item) => item.brand === brand).length} producto(s) cargado(s)`,
    }));
  renderSuggestionMenu(els.productBrandMenu, items, (value) => {
    els.productFields.brand.value = value;
    hideProductBrandMenu();
    els.productFields.model.focus();
    refreshProductModelMenu(true);
  });
}

function refreshProductModelMenu(showAll = false) {
  if (!isFieldMenuActive(els.productFields.model, els.productModelMenu, showAll)) {
    hideProductModelMenu();
    return;
  }
  const query = normalizeSearch(els.productFields.model.value);
  const items = productModelOptions()
    .filter((model) => showAll || !query || normalizeSearch(model).includes(query))
    .slice(0, 12)
    .map((model) => ({
      value: model,
      title: model,
      detail: [els.productFields.type.value.trim(), els.productFields.brand.value.trim()].filter(Boolean).join(" - ") || "Modelo sugerido",
    }));
  renderSuggestionMenu(els.productModelMenu, items, (value) => {
    els.productFields.model.value = value;
    hideProductModelMenu();
  });
}

function hideProductBrandMenu() {
  els.productBrandMenu?.classList.remove("visible");
}

function hideProductModelMenu() {
  els.productModelMenu?.classList.remove("visible");
}

function hideProductBrandMenuOnOutsideClick(event) {
  if (!els.productBrandMenu?.classList.contains("visible")) return;
  if (isEventInsideCombo(event, els.productFields.brand, els.productBrandMenu)) return;
  hideProductBrandMenu();
}

function hideProductModelMenuOnOutsideClick(event) {
  if (!els.productModelMenu?.classList.contains("visible")) return;
  if (isEventInsideCombo(event, els.productFields.model, els.productModelMenu)) return;
  hideProductModelMenu();
}

function updateProductSuggestions() {
  refreshProductBrandMenu(false);
  refreshProductModelMenu(false);
}

function fillProductMarginFromType() {
  if (els.productFields.margin.value.trim()) return;
  const type = els.productFields.type.value.trim();
  const configured = getConfiguredMargin(type);
  if (configured !== null) {
    els.productFields.margin.value = String(configured);
    refreshProductFinalPrice();
  }
}

function refreshProductFinalPrice() {
  const product = getProductFormData();
  els.productFields.finalPrice.value = money(productFinalPrice(product));
}

function renderClients() {
  const query = normalizeSearch(els.search.value);
  const filtered = state.clients.filter((client) => {
    const text = normalizeSearch(
      [
        client.id,
        client.name,
        client.province,
        client.city,
        client.address,
        client.phone1,
        client.phone2,
        client.document,
        client.comments,
      ].join(" ")
    );
    return text.includes(query);
  });

  els.tbody.innerHTML = "";
  filtered.forEach((client) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(client.id)}</td>
      <td><strong>${escapeHtml(client.name)}</strong></td>
      <td>${escapeHtml(client.province)}</td>
      <td>${escapeHtml(client.city)}</td>
      <td>${escapeHtml(client.phone1)}</td>
      <td>${escapeHtml(client.phone2)}</td>
      <td>${escapeHtml(client.document)}</td>
      <td>${escapeHtml(client.comments)}</td>
    `;
    markSelectedRow("clients", client.id, tr);
    tr.addEventListener("click", () => {
      selectRow("clients", client.id, tr);
    });
    tr.addEventListener("contextmenu", (event) => {
      selectRow("clients", client.id, tr);
      showActionMenu("clients", client.id, event);
    });
    tr.addEventListener("dblclick", () => openClientDialog(client.id));
    els.tbody.appendChild(tr);
  });

  els.empty.classList.toggle("visible", filtered.length === 0);
}

function openClientDialog(id = null) {
  state.editingId = id;
  els.error.textContent = "";
  els.form.reset();
  els.dialogTitle.textContent = id ? "Editar cliente" : "Nuevo cliente";

  const client = state.clients.find((item) => item.id === id);
  if (client) {
    els.fields.name.value = client.name;
    els.fields.document.value = client.document;
    els.fields.province.value = client.province;
    els.fields.city.value = client.city;
    els.fields.address.value = client.address;
    els.fields.phone1.value = client.phone1;
    els.fields.phone2.value = client.phone2;
    els.fields.comments.value = client.comments;
    loadCities(client.province, client.city);
  }

  if (!els.dialog.open) els.dialog.showModal();
  focusDialogShell(els.dialog);
}

function closeClientDialog() {
  els.dialog.close();
}

function saveClient(event) {
  event.preventDefault();
  els.error.textContent = "";

  const data = getFormData();
  const validation = validateClient(data);
  if (!validation.ok) {
    els.error.textContent = validation.message;
    validation.field?.focus();
    return;
  }

  let savedId = state.editingId;
  if (state.editingId) {
    state.clients = state.clients.map((client) =>
      client.id === state.editingId ? { ...client, ...data } : client
    );
  } else {
    savedId = nextClientId();
    state.clients.push({
      id: savedId,
      ...data,
      createdAt: new Date().toISOString(),
    });
  }

  persistClients();
  state.selectedRow = { type: "clients", id: savedId };
  renderAll();
  showToast(state.editingId ? "Cliente actualizado" : "Cliente agregado");
  if (els.serviceDialog.open) {
    els.serviceFields.client.value = clientToOption(getClientById(savedId));
    refreshServiceEquipmentSelect();
  }
  closeClientDialog();
}

function getFormData() {
  return {
    name: els.fields.name.value.trim(),
    document: els.fields.document.value.trim(),
    province: els.fields.province.value.trim(),
    city: els.fields.city.value.trim(),
    address: els.fields.address.value.trim(),
    phone1: els.fields.phone1.value.trim(),
    phone2: els.fields.phone2.value.trim(),
    comments: els.fields.comments.value.trim(),
  };
}

function validateClient(data) {
  if (!data.name) {
    return { ok: false, message: "Debe ingresar el nombre del cliente.", field: els.fields.name };
  }

  if (!state.offlineGeo) {
    if (!listIncludesLoose(state.provinces, data.province)) {
      return {
        ok: false,
        message: "Debe escribir y seleccionar una provincia valida.",
        field: els.fields.province,
      };
    }

    if (state.cities.length > 0 && !listIncludesLoose(state.cities, data.city)) {
      return {
        ok: false,
        message: "Debe escribir y seleccionar una localidad valida.",
        field: els.fields.city,
      };
    }
  }

  const incomingBase = getDniBase(data.document);
  const incomingName = data.name.toLocaleLowerCase("es-AR");

  for (const client of state.clients) {
    if (client.id === state.editingId) continue;

    const currentBase = getDniBase(client.document);
    if (incomingBase && incomingBase === currentBase) {
      return {
        ok: false,
        message: `El documento ya pertenece al cliente "${client.name}".`,
        field: els.fields.document,
      };
    }

    const currentName = String(client.name).trim().toLocaleLowerCase("es-AR");
    if (currentName === incomingName && !data.document && !client.document) {
      return {
        ok: false,
        message: "Ya existe un cliente con ese nombre exacto. Ingrese DNI/CUIT para diferenciarlo.",
        field: els.fields.document,
      };
    }
  }

  return { ok: true };
}

async function deleteClient(id) {
  const client = state.clients.find((item) => item.id === id);
  if (!client) return;
  const snapshot = snapshotData();

  const relatedEquipmentIds = new Set(state.equipment.filter((item) => item.clientId === id).map((item) => item.id));
  const relatedServices = state.services.filter((service) =>
    service.clientId === id || relatedEquipmentIds.has(service.equipmentId)
  );
  const relatedEquipmentCount = relatedEquipmentIds.size;
  const relatedServiceCount = relatedServices.length;

  if (relatedEquipmentCount || relatedServiceCount) {
    const choice = await showMessage(
      "Cliente con datos asociados",
      `"${client.name}" tiene ${relatedEquipmentCount} equipo(s) y ${relatedServiceCount} service(s) asociados.\n\nSeleccione que desea eliminar.`,
      "warning",
      "choices",
      [
        { label: "Solo services", value: "services", className: "primary-action" },
        { label: "Equipos + services", value: "equipment-services", className: "primary-action" },
        { label: "Todo completo", value: "all", className: "choice-complete-button" },
      ]
    );

    if (!choice) return;

    deleteClientRelatedData(id, choice, relatedEquipmentIds);
    renderAll();
    showToast("Datos eliminados", { actionLabel: "Deshacer", onAction: () => restoreSnapshot(snapshot) });
    return;
  }

  const confirmed = await showMessage("Confirmar eliminacion", `Eliminar a "${client.name}"?\n\nEsta accion no se puede deshacer.`, "warning", "confirm");
  if (!confirmed) return;

  state.clients = state.clients.filter((item) => item.id !== id);
  persistClients();
  state.selectedRow = null;
  renderAll();
  showToast("Cliente eliminado", { actionLabel: "Deshacer", onAction: () => restoreSnapshot(snapshot) });
}

function deleteClientRelatedData(clientId, scope, relatedEquipmentIds) {
  state.selectedRow = null;

  state.services = state.services.filter((service) =>
    service.clientId !== clientId && !relatedEquipmentIds.has(service.equipmentId)
  );
  persistServices();

  if (scope === "equipment-services" || scope === "all") {
    state.equipment = state.equipment.filter((item) => item.clientId !== clientId);
    persistEquipment();
  }

  if (scope === "all") {
    state.clients = state.clients.filter((item) => item.id !== clientId);
    persistClients();
  }

  if (state.selectedRow?.type === "clients" && state.selectedRow.id === clientId && scope === "all") {
    state.selectedRow = null;
  }

  if (state.serviceHistoryFilter?.type === "client" && state.serviceHistoryFilter.id === clientId) {
    state.serviceHistoryFilter = null;
  }

  if (
    state.serviceHistoryFilter?.type === "equipment" &&
    relatedEquipmentIds.has(state.serviceHistoryFilter.id) &&
    (scope === "equipment-services" || scope === "all")
  ) {
    state.serviceHistoryFilter = null;
  }
}

function openEquipmentDialog(id = null, seed = {}) {
  if (state.clients.length === 0) {
    showMessage("Faltan datos", "Primero debe cargar al menos un cliente.", "warning");
    showView("clients");
    return;
  }

  state.editingEquipmentId = id;
  state.pattern = [];
  els.equipmentError.textContent = "";
  els.equipmentForm.reset();
  els.equipmentDialogTitle.textContent = id ? "Editar equipo" : "Nuevo equipo";
  els.equipmentClientWrap.classList.toggle("hidden", Boolean(seed.hideClient));
  hideEquipmentClientMenu();

  const equipment = state.equipment.find((item) => item.id === id);
  if (equipment) {
    setEquipmentClient(getClientById(equipment.clientId));
    const typeOption = equipmentTypeToOption(equipment.type);
    els.equipmentFields.type.value = typeOption || "Otro";
    els.equipmentFields.otherType.value = typeOption ? "" : equipment.type;
    els.equipmentFields.brand.value = equipment.brand;
    els.equipmentFields.model.value = equipment.model;
    els.equipmentFields.serial.value = equipment.serial;
    els.equipmentFields.condition.value = equipment.condition;
    els.equipmentFields.password.value = equipment.password;
    state.pattern = equipment.pattern ? equipment.pattern.split("-").map(Number) : [];
  } else if (seed.clientId) {
    setEquipmentClient(getClientById(seed.clientId));
  }

  updateEquipmentVisibility();
  syncEquipmentTypePicker();
  updateBrandSuggestions();
  updateModelSuggestions();
  if (!els.equipmentDialog.open) els.equipmentDialog.showModal();
  renderPattern();
  requestAnimationFrame(renderPattern);
  focusDialogShell(
    els.equipmentDialog,
    hideEquipmentClientMenu,
    hideEquipmentTypeMenu,
    hideEquipmentBrandMenu,
    hideEquipmentModelMenu
  );
}

function closeEquipmentDialog() {
  hideEquipmentClientMenu();
  hideEquipmentTypeMenu();
  els.equipmentDialog.close();
}

function openQuickEquipmentDialog() {
  const clientId = optionToClientId(els.serviceFields.client.value);
  if (!clientId) {
    showMessage("Faltan datos", "Seleccione un cliente valido antes de crear un equipo.", "warning");
    els.serviceFields.client.focus();
    return;
  }
  openEquipmentDialog(null, { clientId, hideClient: true });
}

function openQuickEditClientDialog() {
  const clientId = optionToClientId(els.serviceFields.client.value);
  if (!clientId) {
    showMessage("Seleccione un cliente", "Seleccione un cliente valido para editarlo.", "warning");
    return;
  }
  openClientDialog(clientId);
}

function openQuickEditEquipmentDialog() {
  const equipmentId = Number(els.serviceFields.equipment.value);
  if (!equipmentId) {
    showMessage("Seleccione un equipo", "Seleccione un equipo valido para editarlo.", "warning");
    return;
  }
  openEquipmentDialog(equipmentId, { hideClient: true });
}

function openQuickEditPartDialog() {
  const productId = optionToProductId(els.serviceFields.partProduct.value);
  if (!productId) {
    showMessage("Seleccione un repuesto", "Seleccione un repuesto valido para editarlo.", "warning");
    return;
  }
  openProductDialog(productId);
}

function addCurrentWorkToPreset() {
  const description = els.serviceFields.workDescription.value.trim();
  const price = parseMoney(els.serviceFields.workPrice.value);
  if (!description || !price) {
    showMessage("Faltan datos", "Escriba un trabajo y su precio para guardarlo como predeterminado.", "warning");
    return;
  }

  const current = state.settings.frequentWorks.find((work) => work.description === description);
  if (current) current.price = price;
  else state.settings.frequentWorks.push({ description, price });

  persistSettings();
  refreshFrequentWorkDatalist();
  showMessage("Trabajo guardado", "El trabajo fue agregado a predeterminados.", "info");
}

function saveEquipment(event) {
  event.preventDefault();
  els.equipmentError.textContent = "";

  const data = getEquipmentFormData();
  const validation = validateEquipment(data);
  if (!validation.ok) {
    els.equipmentError.textContent = validation.message;
    validation.field?.focus();
    return;
  }

  let savedId = state.editingEquipmentId;
  if (state.editingEquipmentId) {
    state.equipment = state.equipment.map((equipment) =>
      equipment.id === state.editingEquipmentId ? { ...equipment, ...data } : equipment
    );
  } else {
    savedId = nextEquipmentId();
    state.equipment.push({
      id: savedId,
      ...data,
      createdAt: new Date().toISOString(),
    });
  }

  persistEquipment();
  state.selectedRow = { type: "equipment", id: savedId };
  keepSavedEquipmentVisible(savedId);
  renderAll();
  showToast(state.editingEquipmentId ? "Equipo actualizado" : "Equipo agregado");
  if (els.serviceDialog.open) {
    const client = getClientById(data.clientId);
    if (client) els.serviceFields.client.value = clientToOption(client);
    refreshServiceEquipmentSelect();
    els.serviceFields.equipment.value = String(savedId);
    syncServiceEquipmentPicker();
  }
  closeEquipmentDialog();
}

function keepSavedEquipmentVisible(id) {
  const equipment = getEquipmentById(id);
  if (!equipment || !els.equipmentSearch.value.trim()) return;

  const client = getClientById(equipment.clientId);
  const text = normalizeSearch([
    equipment.id,
    client?.name,
    equipment.type,
    equipment.brand,
    equipment.model,
    equipment.serial,
    equipment.password,
    equipment.condition,
  ].join(" "));
  const query = normalizeSearch(els.equipmentSearch.value);
  if (!text.includes(query)) {
    els.equipmentSearch.value = "";
  }
}

function getEquipmentFormData() {
  const baseType = cleanEquipmentType(els.equipmentFields.type.value);
  const type = baseType === "Otro" ? els.equipmentFields.otherType.value.trim() : baseType;
  const clientId = Number(els.equipmentFields.clientId.value) || optionToClientId(els.equipmentFields.client.value);
  const canHavePassword = ["Telefono", "Tablet", "Notebook", "CPU / PC"].includes(baseType);
  const canHavePattern = ["Telefono", "Tablet"].includes(baseType);

  return {
    clientId,
    type,
    brand: els.equipmentFields.brand.value.trim(),
    model: els.equipmentFields.model.value.trim(),
    serial: els.equipmentFields.serial.value.trim(),
    condition: els.equipmentFields.condition.value.trim(),
    password: canHavePassword ? els.equipmentFields.password.value.trim() : "",
    pattern: canHavePattern ? state.pattern.join("-") : "",
  };
}

function validateEquipment(data) {
  if (!data.clientId) {
    return { ok: false, message: "Debe seleccionar un cliente valido.", field: els.equipmentFields.client };
  }
  if (!data.type) {
    const field = cleanEquipmentType(els.equipmentFields.type.value) === "Otro" ? els.equipmentFields.otherType : els.equipmentFields.type;
    return { ok: false, message: "Debe indicar el tipo de equipo.", field };
  }
  if (!data.brand) {
    return { ok: false, message: "Debe ingresar la marca.", field: els.equipmentFields.brand };
  }
  if (!data.model) {
    return { ok: false, message: "Debe ingresar el modelo.", field: els.equipmentFields.model };
  }
  return { ok: true };
}

async function deleteEquipment(id) {
  const equipment = state.equipment.find((item) => item.id === id);
  if (!equipment) return;
  const snapshot = snapshotData();

  const hasServices = state.services.some((service) => service.equipmentId === id);
  if (hasServices) {
    await showMessage("Error al eliminar", "No se puede eliminar este equipo porque tiene servicios asociados.", "error");
    return;
  }

  const confirmed = await showMessage("Confirmar eliminacion", `Eliminar el equipo ${equipment.type} ${equipment.brand} ${equipment.model}?`, "warning", "confirm");
  if (!confirmed) return;

  state.equipment = state.equipment.filter((item) => item.id !== id);
  persistEquipment();
  state.selectedRow = null;
  renderAll();
  showToast("Equipo eliminado", { actionLabel: "Deshacer", onAction: () => restoreSnapshot(snapshot) });
}

function openServiceDialog(id = null) {
  if (state.clients.length === 0) {
    showMessage("Faltan datos", "Primero debe cargar al menos un cliente.", "warning");
    showView("clients");
    return;
  }

  state.editingServiceId = id;
  state.serviceWorks = [];
  state.serviceParts = [];
  state.serviceIssues = [];
  state.externalWorks = [];
  els.serviceError.textContent = "";
  els.serviceForm.reset();
  els.serviceDialogTitle.textContent = id ? "Editar servicio" : "Nuevo servicio";
  refreshServiceClientDatalist();

  const service = state.services.find((item) => item.id === id);
  if (service) {
    const client = getClientById(service.clientId);
    els.serviceFields.client.value = clientToOption(client);
    refreshServiceEquipmentSelect();
    els.serviceFields.equipment.value = String(service.equipmentId);
    syncServiceEquipmentPicker();
    els.serviceFields.status.value = service.status;
    els.serviceFields.derived.value = service.derived;
    els.serviceFields.diagnosis.value = service.diagnosis;
    els.serviceFields.accessories.value = service.accessories;
    els.serviceFields.externalWork.value = service.externalWork;
    els.serviceFields.externalCost.value = service.externalCost ? String(service.externalCost) : "";
    state.serviceIssues = service.issues ? structuredClone(service.issues) : legacyIssuesFromFailure(service.failure);
    state.serviceWorks = service.works ? normalizeServiceWorks(service.works) : [];
    state.serviceParts = service.parts ? structuredClone(service.parts) : [];
    state.externalWorks = service.externalWorks ? structuredClone(service.externalWorks) : legacyExternalWorks(service);
  } else {
    els.serviceFields.status.value = "Sin revisar";
    const lastClient = state.clients[state.clients.length - 1];
    if (lastClient) els.serviceFields.client.value = clientToOption(lastClient);
    refreshServiceEquipmentSelect();
  }

  configureServiceTabs(!id);
  showServiceTab("service-client-tab");
  renderServiceIssues();
  renderRequestedWorks();
  renderServiceWorks();
  renderServiceParts();
  renderExternalWorks();
  refreshPartProductDatalist();
  refreshServiceTotal();
  if (!els.serviceDialog.open) els.serviceDialog.showModal();
  focusDialogShell(
    els.serviceDialog,
    hideServiceClientMenu,
    hideServiceEquipmentMenu
  );
}

function closeServiceDialog() {
  els.serviceDialog.close();
}

function saveService(event) {
  event.preventDefault();
  els.serviceError.textContent = "";

  const data = getServiceFormData();
  const validation = validateService(data);
  if (!validation.ok) {
    els.serviceError.textContent = validation.message;
    validation.field?.focus();
    return;
  }

  const snapshot = snapshotData();
  const previousStatus = state.editingServiceId
    ? state.services.find((service) => service.id === state.editingServiceId)?.status
    : null;
  const resetToNewStage = ["Revisado", "Retiro demorado", "Entregado"].includes(previousStatus) &&
    ["Sin revisar", "Revision demorada"].includes(data.status);
  const serviceData = resetToNewStage ? resetServiceWorkStage(data) : data;
  let savedId = state.editingServiceId;
  if (state.editingServiceId) {
    const previous = state.services.find((service) => service.id === state.editingServiceId);
    const dates = nextServiceDates(previous, serviceData.status);
    state.services = state.services.map((service) =>
      service.id === state.editingServiceId ? { ...service, ...serviceData, ...dates } : service
    );
  } else {
    savedId = nextServiceId();
    state.services.push({
      id: savedId,
      ...serviceData,
      entryDate: new Date().toISOString(),
      finishDate: ["Revisado", "Retiro demorado", "Entregado"].includes(serviceData.status) ? new Date().toISOString() : "",
      deliveryDate: serviceData.status === "Entregado" ? new Date().toISOString() : "",
    });
  }

  persistServices();
  state.selectedRow = { type: "services", id: savedId };
  keepSavedServiceVisible(savedId);
  renderAll();
  const statusChanged = state.editingServiceId && previousStatus && previousStatus !== data.status;
  showToast(state.editingServiceId ? "Servicio actualizado" : "Servicio agregado", statusChanged ? {
    actionLabel: "Deshacer",
    onAction: () => restoreSnapshot(snapshot),
  } : {});
  closeServiceDialog();
}

function resetServiceWorkStage(data) {
  const requestedWorks = data.works
    .filter((work) => work.source === "requested")
    .map((work) => ({
      ...work,
      done: false,
      note: "",
      price: 0,
    }));
  return {
    ...data,
    derived: "",
    externalWork: "",
    externalCost: 0,
    works: requestedWorks,
    externalWorks: [],
    parts: [],
    total: 0,
  };
}

function keepSavedServiceVisible(id) {
  const service = state.services.find((item) => item.id === id);
  if (!service) return;

  const allowedStatuses = getAllowedServiceStatuses();
  const hiddenByStatus = allowedStatuses.length > 0 && !allowedStatuses.includes(service.status);
  const hiddenByHistory = state.serviceHistoryFilter &&
    ((state.serviceHistoryFilter.type === "client" && state.serviceHistoryFilter.id !== service.clientId) ||
      (state.serviceHistoryFilter.type === "equipment" && state.serviceHistoryFilter.id !== service.equipmentId));

  if (hiddenByStatus) {
    state.settings.serviceFilters = { all: true, statuses: [] };
    persistSettings();
  }
  if (hiddenByHistory) {
    state.serviceHistoryFilter = null;
  }
}

function getServiceFormData() {
  const externalCost = state.externalWorks.reduce((sum, work) => sum + work.price, 0);
  const worksTotal = state.serviceWorks.reduce((sum, work) => sum + work.price, 0);
  const partsTotal = state.serviceParts.reduce((sum, part) => sum + part.quantity * part.salePrice, 0);
  const failureText = state.serviceIssues.map((issue) => issue.comment ? `${issue.description} (${issue.comment})` : issue.description).join(" | ");
  els.serviceFields.failure.value = failureText;
  return {
    clientId: optionToClientId(els.serviceFields.client.value),
    equipmentId: Number(els.serviceFields.equipment.value),
    status: els.serviceFields.status.value,
    failure: failureText,
    diagnosis: els.serviceFields.diagnosis.value.trim(),
    accessories: els.serviceFields.accessories.value.trim(),
    derived: els.serviceFields.derived.value.trim(),
    externalWork: state.externalWorks.map((work) => `${work.technician}: ${work.description}`).join(" | "),
    externalCost,
    works: structuredClone(state.serviceWorks),
    issues: structuredClone(state.serviceIssues),
    externalWorks: structuredClone(state.externalWorks),
    parts: structuredClone(state.serviceParts),
    total: worksTotal + partsTotal + externalCost,
  };
}

function validateService(data) {
  if (!data.clientId) {
    return { ok: false, message: "Debe seleccionar un cliente valido.", field: els.serviceFields.client };
  }
  if (!data.equipmentId) {
    return { ok: false, message: "Debe seleccionar un equipo.", field: els.serviceFields.equipment };
  }
  const hasFailure = state.serviceIssues.length > 0;
  const hasRequestedWork = data.works.some((work) => work.source === "requested" && work.description);
  if (!hasFailure && !hasRequestedWork) {
    showServiceTab("service-diagnosis-tab");
    return {
      ok: false,
      message: "Debe ingresar al menos una falla o un trabajo a realizar.",
      field: els.serviceFields.issueDescription,
    };
  }
  return { ok: true };
}

function showServiceTab(tabId) {
  els.serviceTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.serviceTab === tabId));
  els.serviceTabPanels.forEach((panel) => panel.classList.toggle("active", panel.id === tabId));
}

function configureServiceTabs(isNew) {
  const status = els.serviceFields.status.value || "Sin revisar";
  const statusVisible = !isNew;
  const allowExecutionTabs = !["Sin revisar", "Revision demorada"].includes(status) && !isNew;
  els.serviceTabs.forEach((tab) => {
    const tabId = tab.dataset.serviceTab;
    const shouldHide = tabId === "service-status-tab"
      ? !statusVisible
      : ["service-work-tab", "service-parts-tab", "service-derived-tab", "service-summary-tab"].includes(tabId)
        ? !allowExecutionTabs
        : false;
    tab.classList.toggle("hidden", shouldHide);
  });

  const activeHidden = els.serviceTabs.some((tab) => tab.classList.contains("active") && tab.classList.contains("hidden"));
  if (isNew) showServiceTab("service-client-tab");
  else if (activeHidden) showServiceTab("service-diagnosis-tab");
}

function addServiceIssue() {
  const description = els.serviceFields.issueDescription.value.trim();
  if (!description) {
    els.serviceError.textContent = "Escriba una falla para agregarla a la lista.";
    els.serviceFields.issueDescription.focus();
    return;
  }

  state.serviceIssues.push({ description, comment: "" });
  els.serviceFields.issueDescription.value = "";
  els.serviceError.textContent = "";
  renderServiceIssues();
}

function renderServiceIssues() {
  els.serviceIssuesBody.innerHTML = "";
  state.serviceIssues.forEach((issue, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(issue.description)}</td>
      <td><button class="small-button delete" type="button" data-remove-issue="${index}">Quitar</button></td>
    `;
    els.serviceIssuesBody.appendChild(tr);
  });

  els.serviceIssuesBody.querySelectorAll("[data-remove-issue]").forEach((button) => {
    button.addEventListener("click", () => {
      state.serviceIssues.splice(Number(button.dataset.removeIssue), 1);
      renderServiceIssues();
    });
  });
  decorateActionButtons(els.serviceIssuesBody);
  toggleTableVisibility(els.serviceIssuesBody);
}

function addRequestedServiceWork() {
  const description = els.serviceFields.requestedWorkDescription.value.trim();
  if (!description) {
    els.serviceError.textContent = "Escriba un trabajo para agregarlo a la lista.";
    els.serviceFields.requestedWorkDescription.focus();
    return;
  }

  const exists = state.serviceWorks.some((work) =>
    normalizeSearch(work.description) === normalizeSearch(description) && work.source === "requested"
  );
  if (!exists) {
    state.serviceWorks.push({ description, price: 0, done: false, note: "", source: "requested" });
  }
  els.serviceFields.requestedWorkDescription.value = "";
  els.serviceError.textContent = "";
  renderRequestedWorks();
  renderServiceWorks();
  refreshServiceTotal();
}

function requestedWorks() {
  return state.serviceWorks
    .map((work, index) => ({ work, index }))
    .filter((item) => item.work.source === "requested");
}

function renderRequestedWorks() {
  els.requestedWorksBody.innerHTML = "";
  requestedWorks().forEach(({ work, index }) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(work.description)}</td>
      <td><button class="small-button delete" type="button" data-remove-requested-work="${index}">Quitar</button></td>
    `;
    els.requestedWorksBody.appendChild(tr);
  });

  els.requestedWorksBody.querySelectorAll("[data-remove-requested-work]").forEach((button) => {
    button.addEventListener("click", () => {
      state.serviceWorks.splice(Number(button.dataset.removeRequestedWork), 1);
      renderRequestedWorks();
      renderServiceWorks();
      refreshServiceTotal();
    });
  });
  decorateActionButtons(els.requestedWorksBody);
  toggleTableVisibility(els.requestedWorksBody);
}

function addServiceWork() {
  const description = els.serviceFields.workDescription.value.trim();
  const price = parseMoney(els.serviceFields.workPrice.value);
  const note = els.serviceFields.workNote.value.trim();
  if (!description || !price) {
    els.serviceError.textContent = "Escriba un trabajo y su precio.";
    return;
  }

  state.serviceWorks.push({ description, price, done: true, note, source: "extra" });
  const existingFrequent = state.settings.frequentWorks.find((work) => work.description === description);
  if (!existingFrequent) {
    state.settings.frequentWorks.push({ description, price });
    persistSettings();
    refreshFrequentWorkDatalist();
  }
  els.serviceFields.workDescription.value = "";
  els.serviceFields.workPrice.value = "";
  els.serviceFields.workNote.value = "";
  els.serviceError.textContent = "";
  renderServiceWorks();
  refreshServiceTotal();
}

function fillFrequentWorkPrice() {
  if (els.serviceFields.workPrice.value.trim()) return;
  const description = els.serviceFields.workDescription.value.trim();
  const work = state.settings.frequentWorks.find((item) => item.description === description);
  if (work) {
    els.serviceFields.workPrice.value = String(work.price);
  }
}

async function addServicePart() {
  const productId = optionToProductId(els.serviceFields.partProduct.value);
  const product = getProductById(productId);
  const quantity = Math.max(1, parseMoney(els.serviceFields.partQuantity.value) || 1);

  if (!product) {
    const text = els.serviceFields.partProduct.value.trim();
    if (text) {
      const create = await showMessage(
        "Repuesto nuevo",
        `El repuesto "${text}" no existe en el catalogo.\n\nDesea cargarlo ahora?`,
        "warning",
        "confirm"
      );
      if (create) {
        openProductDialog(null, { type: text });
        return;
      }
    }
    els.serviceError.textContent = "Seleccione un repuesto valido del catalogo.";
    els.serviceFields.partProduct.focus();
    return;
  }

  const current = state.serviceParts.find((part) => part.productId === product.id);
  if (current) {
    current.quantity += quantity;
    current.salePrice = productFinalPrice(product);
  } else {
    state.serviceParts.push({
      productId: product.id,
      quantity,
      salePrice: productFinalPrice(product),
    });
  }

  els.serviceFields.partProduct.value = "";
  els.serviceFields.partQuantity.value = "";
  els.serviceError.textContent = "";
  renderServiceParts();
  refreshServiceTotal();
}

function addExternalWork() {
  const technician = els.serviceFields.derived.value.trim();
  const description = els.serviceFields.externalWork.value.trim();
  const price = parseMoney(els.serviceFields.externalCost.value);

  if (!technician || !description || !price) {
    els.serviceError.textContent = "Complete tecnico, trabajo derivado y precio.";
    return;
  }

  state.externalWorks.push({ technician, description, price });
  els.serviceFields.externalWork.value = "";
  els.serviceFields.externalCost.value = "";
  els.serviceError.textContent = "";
  renderExternalWorks();
  refreshServiceTotal();
}

function renderServiceWorks() {
  els.serviceWorksBody.innerHTML = "";
  state.serviceWorks.forEach((work, index) => {
    const source = work.source === "requested" ? "Pedido por cliente" : "Extra";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(work.description)}</strong>
        <span class="muted-line">${source}</span>
      </td>
      <td><input type="checkbox" data-work-done="${index}" ${work.done === false ? "" : "checked"}></td>
      <td><input type="text" data-work-note="${index}" value="${escapeHtml(work.note || "")}" placeholder="${work.done === false ? "Motivo" : "Comentario"}"></td>
      <td><input class="price-input" type="text" inputmode="numeric" data-work-price="${index}" value="${escapeHtml(String(work.price || ""))}" placeholder="$ 0" ${work.done === false ? "disabled" : ""}></td>
      <td><button class="small-button delete" type="button" data-remove-work="${index}">Quitar</button></td>
    `;
    els.serviceWorksBody.appendChild(tr);
    tr.classList.toggle("work-done", work.done !== false);
    tr.classList.toggle("work-pending", work.done === false);
  });

  els.serviceWorksBody.querySelectorAll("[data-work-done]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const index = Number(checkbox.dataset.workDone);
      state.serviceWorks[index].done = checkbox.checked;
      if (!checkbox.checked) {
        state.serviceWorks[index].price = 0;
      }
      renderServiceWorks();
      refreshServiceTotal();
    });
  });
  els.serviceWorksBody.querySelectorAll("[data-work-note]").forEach((input) => {
    input.addEventListener("input", () => {
      state.serviceWorks[Number(input.dataset.workNote)].note = input.value;
      refreshServiceSummary();
    });
  });
  els.serviceWorksBody.querySelectorAll("[data-work-price]").forEach((input) => {
    input.addEventListener("input", () => {
      state.serviceWorks[Number(input.dataset.workPrice)].price = parseMoney(input.value);
      refreshServiceTotal();
      refreshServiceSummary();
    });
    input.addEventListener("change", () => {
      const index = Number(input.dataset.workPrice);
      const price = parseMoney(input.value);
      state.serviceWorks[index].price = price;
      input.value = price ? String(price) : "";
      refreshServiceTotal();
      refreshServiceSummary();
    });
  });

  els.serviceWorksBody.querySelectorAll("[data-remove-work]").forEach((button) => {
    button.addEventListener("click", () => {
      state.serviceWorks.splice(Number(button.dataset.removeWork), 1);
      renderRequestedWorks();
      renderServiceWorks();
      refreshServiceTotal();
    });
  });
  decorateActionButtons(els.serviceWorksBody);
  toggleTableVisibility(els.serviceWorksBody);
  refreshServiceSummary();
}

function renderServiceParts() {
  els.servicePartsBody.innerHTML = "";
  state.serviceParts.forEach((part, index) => {
    const product = getProductById(part.productId);
    const subtotal = part.quantity * part.salePrice;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(productLabel(product))}</td>
      <td><input class="quantity-stepper" type="number" min="1" step="1" data-part-quantity="${index}" value="${part.quantity}"></td>
      <td>${money(subtotal)}</td>
      <td><button class="small-button delete" type="button" data-remove-part="${index}">Quitar</button></td>
    `;
    els.servicePartsBody.appendChild(tr);
  });

  els.servicePartsBody.querySelectorAll("[data-part-quantity]").forEach((input) => {
    input.addEventListener("input", () => {
      const index = Number(input.dataset.partQuantity);
      const quantity = Math.max(1, parseMoney(input.value) || 1);
      state.serviceParts[index].quantity = quantity;
      refreshServiceSummary();
      refreshServiceTotal();
    });
    input.addEventListener("change", () => {
      const index = Number(input.dataset.partQuantity);
      const quantity = Math.max(1, parseMoney(input.value) || 1);
      state.serviceParts[index].quantity = quantity;
      input.value = String(quantity);
      renderServiceParts();
      refreshServiceTotal();
    });
  });

  els.servicePartsBody.querySelectorAll("[data-remove-part]").forEach((button) => {
    button.addEventListener("click", () => {
      state.serviceParts.splice(Number(button.dataset.removePart), 1);
      renderServiceParts();
      refreshServiceTotal();
    });
  });
  decorateActionButtons(els.servicePartsBody);
  toggleTableVisibility(els.servicePartsBody);
  refreshServiceSummary();
}

function refreshServiceTotal() {
  const worksTotal = state.serviceWorks.reduce((sum, work) => sum + work.price, 0);
  const partsTotal = state.serviceParts.reduce((sum, part) => sum + part.quantity * part.salePrice, 0);
  const externalTotal = state.externalWorks.reduce((sum, work) => sum + work.price, 0);
  els.serviceTotal.textContent = money(worksTotal + partsTotal + externalTotal);
}

function refreshServiceSummary() {
  if (!els.serviceSummaryBody) return;
  els.serviceSummaryBody.innerHTML = "";
  state.serviceWorks.forEach((work) => {
    const detail = work.source === "requested" ? `${work.description} (pedido por cliente)` : work.description;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>Trabajo</td>
      <td>${escapeHtml(detail)}</td>
      <td>---</td>
      <td>${money(work.price)}</td>
    `;
    els.serviceSummaryBody.appendChild(tr);
  });

  state.serviceParts.forEach((part) => {
    const product = getProductById(part.productId);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>Repuesto</td>
      <td>${escapeHtml(productLabel(product))}</td>
      <td>${part.quantity}</td>
      <td>${money(part.quantity * part.salePrice)}</td>
    `;
    els.serviceSummaryBody.appendChild(tr);
  });

  state.externalWorks.forEach((work) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>Tercero</td>
      <td>${escapeHtml(`${work.technician} - ${work.description}`)}</td>
      <td>---</td>
      <td>${money(work.price)}</td>
    `;
    els.serviceSummaryBody.appendChild(tr);
  });
  toggleTableVisibility(els.serviceSummaryBody);
}

function renderExternalWorks() {
  els.externalWorksBody.innerHTML = "";
  state.externalWorks.forEach((work, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(work.technician)}</td>
      <td>${escapeHtml(work.description)}</td>
      <td>${money(work.price)}</td>
      <td><button class="small-button delete" type="button" data-remove-external-work="${index}">Quitar</button></td>
    `;
    els.externalWorksBody.appendChild(tr);
  });

  els.externalWorksBody.querySelectorAll("[data-remove-external-work]").forEach((button) => {
    button.addEventListener("click", () => {
      state.externalWorks.splice(Number(button.dataset.removeExternalWork), 1);
      renderExternalWorks();
      refreshServiceTotal();
    });
  });
  decorateActionButtons(els.externalWorksBody);
  toggleTableVisibility(els.externalWorksBody);
  refreshServiceSummary();
}

function refreshServiceClientDatalist() {
  fillDatalist(els.serviceClientList, state.clients.map(clientToOption));
}

function handleServiceClientKeydown(event) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    refreshServiceClientMenu(true);
  }
  if (event.key === "Escape") {
    hideServiceClientMenu();
  }
}

function refreshServiceClientMenu(showAll = false) {
  if (!els.serviceClientMenu) return;
  if (!isFieldMenuActive(els.serviceFields.client, els.serviceClientMenu, showAll)) {
    hideServiceClientMenu();
    return;
  }
  const query = normalizeSearch(els.serviceFields.client.value);
  const exactClientId = optionToClientId(els.serviceFields.client.value);
  const matches = state.clients
    .filter((client) => {
      if (showAll || exactClientId) return true;
      const text = normalizeSearch([client.name, client.document, client.phone1, client.phone2, client.city].join(" "));
      return !query || text.includes(query);
    })
    .slice(0, 12);

  els.serviceClientMenu.innerHTML = matches
    .map((client) => clientMenuButtonHtml(client, "service-client-option"))
    .join("");
  els.serviceClientMenu.classList.toggle("visible", matches.length > 0);
  els.serviceClientMenu.addEventListener("pointerdown", keepComboInteraction);
  els.serviceClientMenu.addEventListener("mousedown", keepComboInteraction);
  els.serviceClientMenu.querySelectorAll("[data-service-client-option]").forEach((button) => {
    button.addEventListener("pointerdown", keepComboInteraction);
    button.addEventListener("mousedown", keepComboInteraction);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const client = getClientById(Number(button.dataset.serviceClientOption));
      if (!client) return;
      els.serviceFields.client.value = clientToOption(client);
      hideServiceClientMenu();
      refreshServiceEquipmentSelect();
    });
  });
}

function clientMenuButtonHtml(client, dataName = "client-option") {
  const detail = client.document ? `DNI: ${client.document}` : client.city || "Sin documento";
  return `
    <button type="button" data-${dataName}="${client.id}">
      <strong>${escapeHtml(client.name)}</strong>
      <span>${escapeHtml(detail)}</span>
    </button>
  `;
}

function hideServiceClientMenu() {
  els.serviceClientMenu?.classList.remove("visible");
}

function hideServiceClientMenuOnOutsideClick(event) {
  if (!els.serviceClientMenu?.classList.contains("visible")) return;
  if (isEventInsideCombo(event, els.serviceFields.client, els.serviceClientMenu)) return;
  hideServiceClientMenu();
}

function refreshServiceEquipmentSelect() {
  const clientId = optionToClientId(els.serviceFields.client.value);
  const equipment = state.equipment.filter((item) => item.clientId === clientId);
  const hasEquipment = equipment.length > 0;
  els.serviceFields.equipment.innerHTML = hasEquipment
    ? equipment
        .map((item) => `<option value="${item.id}">${escapeHtml(equipmentLabel(item))}</option>`)
        .join("")
    : `<option value="">Sin equipos cargados</option>`;
  els.serviceFields.equipment.disabled = !hasEquipment;
  els.quickEditEquipment.disabled = !hasEquipment;
  renderServiceEquipmentPicker(equipment);
  els.serviceNoEquipment.classList.toggle("hidden", hasEquipment || !clientId);
}

function renderServiceEquipmentPicker(equipment) {
  const hasEquipment = equipment.length > 0;
  els.serviceEquipmentTrigger.disabled = !hasEquipment;
  els.serviceEquipmentMenu.innerHTML = equipment
    .map((item) => `
      <button type="button" data-service-equipment="${item.id}">
        ${deviceLabelHtml(item)}
      </button>
    `)
    .join("");

  els.serviceEquipmentMenu.addEventListener("pointerdown", keepComboInteraction);
  els.serviceEquipmentMenu.addEventListener("mousedown", keepComboInteraction);
  els.serviceEquipmentMenu.querySelectorAll("[data-service-equipment]").forEach((button) => {
    button.addEventListener("pointerdown", keepComboInteraction);
    button.addEventListener("mousedown", keepComboInteraction);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      els.serviceFields.equipment.value = button.dataset.serviceEquipment;
      syncServiceEquipmentPicker();
      hideServiceEquipmentMenu();
    });
  });
  syncServiceEquipmentPicker();
}

function syncServiceEquipmentPicker() {
  const equipment = getEquipmentById(els.serviceFields.equipment.value);
  els.serviceEquipmentTrigger.innerHTML = equipment ? deviceLabelHtml(equipment) : "Sin equipos cargados";
  els.serviceEquipmentMenu.querySelectorAll("[data-service-equipment]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.serviceEquipment === String(els.serviceFields.equipment.value));
  });
}

function toggleServiceEquipmentMenu(event) {
  event.stopPropagation();
  if (els.serviceEquipmentTrigger.disabled) return;
  els.serviceEquipmentMenu.classList.toggle("visible");
}

function hideServiceEquipmentMenu() {
  els.serviceEquipmentMenu.classList.remove("visible");
}

function hideServiceEquipmentMenuOnOutsideClick(event) {
  if (!els.serviceEquipmentMenu.classList.contains("visible")) return;
  if (isEventInsideCombo(event, null, els.serviceEquipmentMenu, els.serviceEquipmentTrigger)) return;
  hideServiceEquipmentMenu();
}

function refreshPartProductDatalist() {
  fillDatalist(els.partProductList, state.products.map(productToOption));
}

function refreshFrequentWorkDatalist() {
  const seen = new Set();
  const descriptions = state.settings.frequentWorks
    .map((work) => work.description)
    .filter((description) => {
      const key = normalizeSearch(description);
      if (!description || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  fillDatalist(els.frequentWorkList, descriptions);
}

function toggleTableVisibility(tbody) {
  const table = tbody.closest("table");
  if (table) table.classList.toggle("hidden", tbody.children.length === 0);
}

function refreshSettingsTypeDatalist() {
  const types = [
    ...new Set([
      ...state.products.map((product) => product.type),
      ...state.settings.margins.map((margin) => margin.type),
    ]),
  ].sort();
  fillDatalist(els.settingsTypeList, types);
}

async function deleteService(id) {
  const service = state.services.find((item) => item.id === id);
  if (!service) return;
  const snapshot = snapshotData();
  const client = getClientById(service.clientId);
  const confirmed = await showMessage("Confirmar eliminacion", `Eliminar la orden de servicio de ${client?.name || "cliente eliminado"}?`, "warning", "confirm");
  if (!confirmed) return;

  state.services = state.services.filter((item) => item.id !== id);
  persistServices();
  state.selectedRow = null;
  renderAll();
  showToast("Servicio eliminado", { actionLabel: "Deshacer", onAction: () => restoreSnapshot(snapshot) });
}

function nextServiceDates(previous, newStatus) {
  const now = new Date().toISOString();
  if (["Sin revisar", "Revision demorada"].includes(newStatus)) {
    return {
      finishDate: "",
      deliveryDate: "",
    };
  }
  return {
    finishDate: ["Revisado", "Retiro demorado", "Entregado"].includes(newStatus) && !previous.finishDate ? now : previous.finishDate,
    deliveryDate: newStatus === "Entregado" && !previous.deliveryDate ? now : previous.deliveryDate,
  };
}

function legacyIssuesFromFailure(failure) {
  if (!failure) return [];
  return String(failure)
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((description) => ({ description, comment: "" }));
}

function normalizeServiceWorks(works) {
  return works.map((work) => ({
    description: work.description,
    price: Number(work.price || 0),
    done: work.done !== false,
    note: work.note || "",
    source: work.source || "extra",
  }));
}

function legacyExternalWorks(service) {
  if (!service.externalWork && !service.externalCost) return [];
  return [{
    technician: service.derived || "Externo",
    description: service.externalWork || "Trabajo externo",
    price: Number(service.externalCost || 0),
  }];
}

function updateEquipmentVisibility() {
  const type = cleanEquipmentType(els.equipmentFields.type.value);
  els.otherTypeWrap.classList.toggle("hidden", type !== "Otro");
  els.passwordWrap.classList.toggle("hidden", !["Telefono", "Tablet", "Notebook", "CPU / PC"].includes(type));
  els.patternWrap.classList.toggle("hidden", !["Telefono", "Tablet"].includes(type));
}

function renderEquipmentTypePicker() {
  const types = ["Telefono", "Tablet", "Notebook", "CPU / PC", "Monitor", "Impresora", "Otro"];
  els.equipmentTypeMenu.innerHTML = types
    .map((type) => `
      <button type="button" data-equipment-type="${escapeHtml(type)}">
        ${deviceTypeOptionHtml(type)}
      </button>
    `)
    .join("");
  els.equipmentTypeMenu.addEventListener("pointerdown", keepComboInteraction);
  els.equipmentTypeMenu.addEventListener("mousedown", keepComboInteraction);
  els.equipmentTypeMenu.querySelectorAll("[data-equipment-type]").forEach((button) => {
    button.addEventListener("pointerdown", keepComboInteraction);
    button.addEventListener("mousedown", keepComboInteraction);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      els.equipmentFields.type.value = button.dataset.equipmentType;
      els.equipmentFields.type.dispatchEvent(new Event("change", { bubbles: true }));
      hideEquipmentTypeMenu();
    });
  });
  syncEquipmentTypePicker();
}

function toggleEquipmentTypeMenu(event) {
  event.stopPropagation();
  els.equipmentTypeMenu.classList.toggle("visible");
}

function hideEquipmentTypeMenu() {
  els.equipmentTypeMenu.classList.remove("visible");
}

function hideEquipmentTypeMenuOnOutsideClick(event) {
  if (!els.equipmentTypeMenu.classList.contains("visible")) return;
  if (isEventInsideCombo(event, null, els.equipmentTypeMenu, els.equipmentTypeTrigger)) return;
  hideEquipmentTypeMenu();
}

function syncEquipmentTypePicker() {
  const type = cleanEquipmentType(els.equipmentFields.type.value);
  els.equipmentTypeTrigger.innerHTML = type ? deviceTypeOptionHtml(type) : "Seleccione...";
  els.equipmentTypeMenu.querySelectorAll("[data-equipment-type]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.equipmentType === type);
  });
}

function handleEquipmentClientKeydown(event) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    refreshEquipmentClientMenu(true);
  }
  if (event.key === "Escape") {
    hideEquipmentClientMenu();
  }
}

function setEquipmentClient(client) {
  if (!client) {
    els.equipmentFields.client.value = "";
    els.equipmentFields.clientId.value = "";
    return;
  }
  els.equipmentFields.client.value = clientToOption(client);
  els.equipmentFields.clientId.value = String(client.id);
}

function refreshEquipmentClientMenu(showAll = false) {
  if (!els.equipmentClientMenu || els.equipmentClientWrap.classList.contains("hidden")) return;
  if (!isFieldMenuActive(els.equipmentFields.client, els.equipmentClientMenu, showAll)) {
    hideEquipmentClientMenu();
    return;
  }

  const query = normalizeSearch(els.equipmentFields.client.value);
  const matches = state.clients
    .filter((client) => {
      if (showAll) return true;
      const text = normalizeSearch([client.name, client.document, client.phone1, client.phone2, client.city].join(" "));
      return !query || text.includes(query);
    })
    .slice(0, 12);

  els.equipmentClientMenu.innerHTML = matches
    .map((client) => clientMenuButtonHtml(client, "equipment-client-option"))
    .join("");
  els.equipmentClientMenu.classList.toggle("visible", matches.length > 0);
  els.equipmentClientMenu.addEventListener("pointerdown", keepComboInteraction);
  els.equipmentClientMenu.addEventListener("mousedown", keepComboInteraction);
  els.equipmentClientMenu.querySelectorAll("[data-equipment-client-option]").forEach((button) => {
    button.addEventListener("pointerdown", keepComboInteraction);
    button.addEventListener("mousedown", keepComboInteraction);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const client = getClientById(Number(button.dataset.equipmentClientOption));
      if (!client) return;
      setEquipmentClient(client);
      hideEquipmentClientMenu();
    });
  });
}

function hideEquipmentClientMenu() {
  els.equipmentClientMenu?.classList.remove("visible");
}

function hideEquipmentClientMenuOnOutsideClick(event) {
  if (!els.equipmentClientMenu?.classList.contains("visible")) return;
  if (isEventInsideCombo(event, els.equipmentFields.client, els.equipmentClientMenu)) return;
  hideEquipmentClientMenu();
}

function updateBrandSuggestions() {
  refreshEquipmentBrandMenu(false);
  if (!getCurrentEquipmentType()) {
    hideEquipmentBrandMenu();
  }
  updateModelSuggestions();
}

function equipmentBrandOptions() {
  const type = getCurrentEquipmentType();
  return [...new Set(
    state.equipment
      .filter((item) => (!type || item.type === type) && item.brand)
      .map((item) => item.brand)
  )].sort();
}

function equipmentModelOptions() {
  const type = getCurrentEquipmentType();
  const brand = els.equipmentFields.brand.value.trim();
  return [...new Set(
    state.equipment
      .filter((item) => (!type || item.type === type) && (!brand || item.brand === brand) && item.model)
      .map((item) => item.model)
  )].sort();
}

function refreshEquipmentBrandMenu(showAll = false) {
  const type = getCurrentEquipmentType();
  if (!type) {
    hideEquipmentBrandMenu();
    return;
  }
  if (!isFieldMenuActive(els.equipmentFields.brand, els.equipmentBrandMenu, showAll)) {
    hideEquipmentBrandMenu();
    return;
  }
  const query = normalizeSearch(els.equipmentFields.brand.value);
  const items = equipmentBrandOptions()
    .filter((brand) => showAll || !query || normalizeSearch(brand).includes(query))
    .slice(0, 12)
    .map((brand) => ({
      value: brand,
      title: brand,
      detail: `${state.equipment.filter((item) => item.brand === brand).length} equipo(s) cargado(s)`,
    }));
  renderSuggestionMenu(els.equipmentBrandMenu, items, (value) => {
    els.equipmentFields.brand.value = value;
    hideEquipmentBrandMenu();
    refreshEquipmentModelMenu(true);
  });
}

function refreshEquipmentModelMenu(showAll = false) {
  const type = getCurrentEquipmentType();
  const brand = els.equipmentFields.brand.value.trim();
  if (!type || !brand) {
    hideEquipmentModelMenu();
    return;
  }
  if (!isFieldMenuActive(els.equipmentFields.model, els.equipmentModelMenu, showAll)) {
    hideEquipmentModelMenu();
    return;
  }
  const query = normalizeSearch(els.equipmentFields.model.value);
  const items = equipmentModelOptions()
    .filter((model) => showAll || !query || normalizeSearch(model).includes(query))
    .slice(0, 12)
    .map((model) => ({
      value: model,
      title: model,
      detail: [type, brand].filter(Boolean).join(" - ") || "Modelo sugerido",
    }));
  renderSuggestionMenu(els.equipmentModelMenu, items, (value) => {
    els.equipmentFields.model.value = value;
    hideEquipmentModelMenu();
  });
}

function hideEquipmentBrandMenu() {
  els.equipmentBrandMenu?.classList.remove("visible");
}

function hideEquipmentModelMenu() {
  els.equipmentModelMenu?.classList.remove("visible");
}

function hideEquipmentBrandMenuOnOutsideClick(event) {
  if (!els.equipmentBrandMenu?.classList.contains("visible")) return;
  if (isEventInsideCombo(event, els.equipmentFields.brand, els.equipmentBrandMenu)) return;
  hideEquipmentBrandMenu();
}

function hideEquipmentModelMenuOnOutsideClick(event) {
  if (!els.equipmentModelMenu?.classList.contains("visible")) return;
  if (isEventInsideCombo(event, els.equipmentFields.model, els.equipmentModelMenu)) return;
  hideEquipmentModelMenu();
}

function updateModelSuggestions() {
  refreshEquipmentModelMenu(false);
}

function getCurrentEquipmentType() {
  const type = cleanEquipmentType(els.equipmentFields.type.value);
  return type === "Otro" ? els.equipmentFields.otherType.value.trim() : type;
}

function startPatternDraw(event) {
  event.preventDefault();
  state.pattern = [];
  state.drawingPattern = true;
  els.patternGrid.setPointerCapture(event.pointerId);
  addPatternDotFromPoint(event.clientX, event.clientY);
}

function continuePatternDraw(event) {
  if (!state.drawingPattern) return;
  event.preventDefault();
  addPatternDotFromPoint(event.clientX, event.clientY);
}

function endPatternDraw(event) {
  if (!state.drawingPattern) return;
  state.drawingPattern = false;
  if (els.patternGrid.hasPointerCapture(event.pointerId)) {
    els.patternGrid.releasePointerCapture(event.pointerId);
  }
}

function addPatternDotFromPoint(clientX, clientY) {
  const button = getPatternDotAtPoint(clientX, clientY);
  if (!button) return;
  const dot = Number(button.dataset.dot);
  if (!state.pattern.includes(dot)) state.pattern.push(dot);
  renderPattern();
}

function renderPattern() {
  els.patternGrid.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("selected", state.pattern.includes(Number(button.dataset.dot)));
  });

  els.patternLines.innerHTML = "";
  const centers = getPatternCenters();
  for (let i = 0; i < state.pattern.length - 1; i += 1) {
    const from = centers[state.pattern[i]];
    const to = centers[state.pattern[i + 1]];
    if (!from || !to) continue;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y);
    line.setAttribute("x2", to.x);
    line.setAttribute("y2", to.y);
    els.patternLines.appendChild(line);
  }
}

function getPatternDotAtPoint(clientX, clientY) {
  const buttons = [...els.patternGrid.querySelectorAll("button")];
  return buttons.find((button) => {
    const rect = button.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  });
}

function getPatternCenters() {
  const gridRect = els.patternGrid.getBoundingClientRect();
  const scaleX = PATTERN_SIZE / gridRect.width;
  const scaleY = PATTERN_SIZE / gridRect.height;
  const centers = {};

  els.patternGrid.querySelectorAll("button").forEach((button) => {
    const rect = button.getBoundingClientRect();
    centers[button.dataset.dot] = {
      x: ((rect.left + rect.width / 2) - gridRect.left) * scaleX,
      y: ((rect.top + rect.height / 2) - gridRect.top) * scaleY,
    };
  });

  return centers;
}

function nextEquipmentId() {
  return state.equipment.reduce((max, equipment) => Math.max(max, equipment.id), 0) + 1;
}

function standardTypes() {
  return ["Telefono", "Tablet", "Notebook", "CPU / PC", "Monitor", "Impresora"];
}

function cleanEquipmentType(type) {
  return String(type || "").replace(/^[^\wÀ-ÿ]+/u, "").trim();
}

function equipmentTypeToOption(type) {
  return ["Telefono", "Tablet", "Notebook", "CPU / PC", "Monitor", "Impresora", "Otro"].includes(type) ? type : "";
}

function getClientById(id) {
  return state.clients.find((client) => client.id === Number(id));
}

function getEquipmentById(id) {
  return state.equipment.find((equipment) => equipment.id === Number(id));
}

function equipmentLabel(equipment) {
  if (!equipment) return "Sin equipo";
  return `${equipment.type} ${equipment.brand} ${equipment.model}`.trim();
}

function deviceLabelHtml(equipment, options = {}) {
  if (!equipment) return "Sin equipo";
  const text = options.text || equipmentLabel(equipment);
  return deviceTypeOptionHtml(equipment.type, text);
}

function deviceTypeOptionHtml(type, text = type) {
  const icon = deviceIconForType(type);
  return `
    <span class="device-label">
      <span class="device-icon"><img src="assets/icons/${icon}" alt=""></span>
      <span>${escapeHtml(text)}</span>
    </span>
  `;
}

function deviceIconForType(type) {
  const normalized = normalizeSearch(type);
  if (normalized.includes("telefono") || normalized.includes("celular")) return "device-phone.svg";
  if (normalized.includes("tablet")) return "device-tablet.svg";
  if (normalized.includes("notebook") || normalized.includes("laptop")) return "device-notebook.svg";
  if (normalized.includes("cpu") || normalized.includes("pc")) return "device-cpu.svg";
  if (normalized.includes("monitor")) return "device-monitor.svg";
  if (normalized.includes("impresora")) return "device-printer.svg";
  if (normalized.includes("playstation") || normalized.includes("nintendo") || normalized.includes("xbox")) return "device-game.svg";
  return "device-generic.svg";
}

function miniPatternHtml(pattern) {
  const points = String(pattern)
    .split("-")
    .map(Number)
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 8);
  if (points.length === 0) return "Sin patron";
  const lines = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const from = miniPatternPoint(points[i]);
    const to = miniPatternPoint(points[i + 1]);
    lines.push(`<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"></line>`);
  }
  const dots = Array.from({ length: 9 }, (_, index) => {
    const point = miniPatternPoint(index);
    const active = points.includes(index) ? " active" : "";
    return `<circle class="mini-pattern-dot${active}" cx="${point.x}" cy="${point.y}" r="4"></circle>`;
  }).join("");
  return `<svg class="mini-pattern" viewBox="0 0 56 56" aria-label="Patron">${lines.join("")}${dots}</svg>`;
}

function miniPatternPoint(index) {
  const col = index % 3;
  const row = Math.floor(index / 3);
  return { x: 10 + col * 18, y: 10 + row * 18 };
}

function deviceTextIcon(equipment) {
  const normalized = normalizeSearch(equipment?.type);
  if (normalized.includes("telefono") || normalized.includes("celular")) return "📱";
  if (normalized.includes("tablet")) return "▯";
  if (normalized.includes("notebook") || normalized.includes("laptop")) return "💻";
  if (normalized.includes("cpu") || normalized.includes("pc")) return "▣";
  if (normalized.includes("monitor")) return "▭";
  if (normalized.includes("impresora")) return "▤";
  if (normalized.includes("playstation") || normalized.includes("nintendo") || normalized.includes("xbox")) return "◇";
  return "□";
}

function clientToOption(client) {
  if (!client) return "";
  const document = client.document ? ` (DNI: ${client.document})` : "";
  return `${client.name}${document}`;
}

function clientTooltip(client) {
  if (!client) return "";
  return [
    `Tel 1: ${client.phone1 || "N/A"}`,
    `Tel 2: ${client.phone2 || "N/A"}`,
    `Loc: ${client.city || "N/A"}`,
    `Dir: ${client.address || "N/A"}`,
  ].join("\n");
}

function equipmentTooltip(equipment) {
  if (!equipment) return "";
  return [
    `Tipo: ${equipment.type || "N/A"}`,
    `Marca: ${equipment.brand || "N/A"}`,
    `Modelo: ${equipment.model || "N/A"}`,
    `Nro. serie: ${equipment.serial || "N/A"}`,
    `Password: ${equipment.password || "No disponible"}`,
    `Patron: ${patternText(equipment.pattern)}`,
    `Estado: ${equipment.condition || "N/A"}`,
  ].join("\n");
}

function patternText(pattern) {
  return pattern ? String(pattern).split("-").map((item) => Number(item) + 1).join(" - ") : "No disponible";
}

function optionToClientId(option) {
  const client = state.clients.find((item) => clientToOption(item) === option);
  return client?.id || null;
}

function nextServiceId() {
  return state.services.reduce((max, service) => Math.max(max, service.id), 0) + 1;
}

function nextProductId() {
  return state.products.reduce((max, product) => Math.max(max, product.id), 0) + 1;
}

function getProductById(id) {
  return state.products.find((product) => product.id === Number(id));
}

function productFinalPrice(product) {
  const cost = Number(product?.cost || 0);
  const margin = productMarginPercent(product);
  return Math.round(cost + (cost * margin) / 100);
}

function productMarginPercent(product) {
  const configured = getConfiguredMargin(product?.type);
  return Number(product?.margin || configured || 0);
}

function getConfiguredMargin(type) {
  const margin = state.settings.margins.find((item) => item.type === type);
  return margin ? Number(margin.percent || 0) : null;
}

function productLabel(product) {
  if (!product) return "Producto eliminado";
  return `${product.type} ${product.brand} ${product.model}`.trim();
}

function productToOption(product) {
  return `${productLabel(product)} - ${money(productFinalPrice(product))}`;
}

function servicePartsSummary(service) {
  return (service.parts || [])
    .map((part) => {
      const product = getProductById(part.productId);
      const quantity = Number(part.quantity || 0);
      return `${quantity} x ${productLabel(product)}`;
    })
    .join(" | ");
}

function serviceDerivationSummary(service) {
  const works = service.externalWorks || legacyExternalWorks(service);
  return works
    .map((work) => {
      const technician = work.technician || "Externo";
      const description = work.description || "Trabajo externo";
      const price = Number(work.price || 0);
      return `${technician} - ${description}${price ? ` - ${money(price)}` : ""}`;
    })
    .join(" | ");
}

function optionToProductId(option) {
  const product = state.products.find((item) => productToOption(item) === option);
  return product?.id || null;
}

function parseMoney(value) {
  const parsed = Number(String(value || "").replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function money(value) {
  return `$ ${Math.round(Number(value || 0)).toLocaleString("es-AR")}`;
}

function formatDate(value) {
  if (!value) return "---";
  return new Intl.DateTimeFormat("es-AR").format(new Date(value));
}

function dateWithAgeHtml(value) {
  if (!value) return "---";
  return `
    <span class="date-age">
      <strong>${escapeHtml(formatDate(value))}</strong>
      <span>${escapeHtml(elapsedFrom(value))}</span>
    </span>
  `;
}

function elapsedFrom(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Math.max(0, Date.now() - date.getTime());
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Hoy";
  if (days < 30) return `${days} dia${days === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mes${months === 1 ? "" : "es"}`;
  const years = Math.floor(months / 12);
  return `${years} año${years === 1 ? "" : "s"}`;
}

function formatDateTime(value) {
  if (!value) return "---";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function countServicesByStatus(status) {
  return String(state.services.filter((service) => service.status === status).length);
}

function displayServiceStatusLabel(status) {
  return {
    "Sin revisar": "Sin ver",
    Revisado: "Finalizado",
  }[status] || status;
}

function statusClass(status) {
  return `status-${normalizeSearch(status).replace(/\s+/g, "-")}`;
}

function serviceStatusRank(status) {
  return {
    "Sin revisar": 1,
    "Revision demorada": 2,
    Revisado: 3,
    "Retiro demorado": 4,
    Entregado: 5,
    Cancelado: 6,
  }[status] || 99;
}

function compareServicesByStatus(a, b) {
  const rankDiff = serviceStatusRank(a.status) - serviceStatusRank(b.status);
  if (rankDiff !== 0) return rankDiff;
  return Number(b.id || 0) - Number(a.id || 0);
}

function elapsedFrom(value) {
  return elapsedPartsText(elapsedPartsSince(value));
}

function elapsedBetween(startValue, endValue) {
  return elapsedPartsText(elapsedPartsBetween(startValue, endValue));
}

function elapsedPartsSince(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return [];
  return elapsedPartsFromDays(Math.floor(Math.max(0, Date.now() - date.getTime()) / 86400000));
}

function elapsedPartsBetween(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  return elapsedPartsFromDays(Math.floor(Math.max(0, end.getTime() - start.getTime()) / 86400000));
}

function elapsedPartsFromDays(days) {
  if (!Number.isFinite(days) || days < 1) return [];
  const years = Math.floor(days / 365);
  const remainingAfterYears = days % 365;
  const months = Math.floor(remainingAfterYears / 30);
  const remainingDays = remainingAfterYears % 30;
  const parts = [];
  if (years > 0) parts.push(`${years} a\u00f1o${years === 1 ? "" : "s"}`);
  if (months > 0) parts.push(`${months} mes${months === 1 ? "" : "es"}`);
  if (remainingDays > 0) parts.push(`${remainingDays} dia${remainingDays === 1 ? "" : "s"}`);
  return parts;
}

function elapsedPartsText(parts) {
  if (!parts || parts.length === 0) return "Hoy";
  return parts.join(" y ");
}

function dateWithAgeHtml(value, options = {}) {
  if (!value) return "---";
  const tooltip = options.tooltip ? ` title="${escapeHtml(options.tooltip)}"` : "";
  return `
    <span class="date-age"${tooltip}>
      <strong>${escapeHtml(formatDate(value))}</strong>
      <span>${escapeHtml(elapsedFrom(value))}</span>
    </span>
  `;
}

function serviceFinalizedTooltip(service) {
  if (!service?.entryDate || !service?.finishDate) return "";
  return `Ingreso -> Finalizado: ${elapsedBetween(service.entryDate, service.finishDate)}`;
}

function serviceDeliveredTooltip(service) {
  const entries = [];
  if (service?.entryDate && service?.finishDate) {
    entries.push(`Ingreso -> Finalizado: ${elapsedBetween(service.entryDate, service.finishDate)}`);
  }
  if (service?.finishDate && service?.deliveryDate) {
    entries.push(`Finalizado -> Entregado: ${elapsedBetween(service.finishDate, service.deliveryDate)}`);
  }
  if (service?.entryDate && service?.deliveryDate) {
    entries.push(`Ingreso -> Entregado: ${elapsedBetween(service.entryDate, service.deliveryDate)}`);
  }
  return entries.join("\n");
}

function nextClientId() {
  return state.clients.reduce((max, client) => Math.max(max, client.id), 0) + 1;
}

function formatDniCuit(text) {
  let numbers = String(text).replace(/\D/g, "");
  if (!numbers) return "";

  if (numbers.length <= 8) {
    const reversed = numbers.split("").reverse().join("");
    const chunks = reversed.match(/.{1,3}/g) || [];
    return chunks.join(".").split("").reverse().join("");
  }

  numbers = numbers.slice(0, 11);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 10) return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
  return `${numbers.slice(0, 2)}-${numbers.slice(2, 10)}-${numbers.slice(10)}`;
}

function getDniBase(text) {
  let numbers = String(text || "").replace(/\D/g, "");
  if (!numbers) return "";
  if (numbers.length === 11) numbers = numbers.slice(2, 10);
  return String(Number(numbers));
}

async function loadProvinces() {
  try {
    const response = await fetch("https://apis.datos.gob.ar/georef/api/provincias?max=100");
    const json = await response.json();
    state.provinces = json.provincias.map((province) => province.nombre).sort();
    fillDatalist(els.provinceList, state.provinces);
    state.offlineGeo = false;
  } catch {
    state.offlineGeo = true;
    state.provinces = [];
  }
}

async function loadCities(province, selectedCity = "") {
  clearDatalist(els.cityList);
  state.cities = [];
  if (!province || state.offlineGeo) return;

  try {
    const url = new URL("https://apis.datos.gob.ar/georef/api/localidades");
    url.searchParams.set("provincia", province);
    url.searchParams.set("campos", "nombre");
    url.searchParams.set("max", "1000");
    const response = await fetch(url);
    const json = await response.json();
    state.cities = [...new Set(json.localidades.map((city) => city.nombre))].sort();
    fillDatalist(els.cityList, state.cities);
    if (selectedCity) els.fields.city.value = selectedCity;
  } catch {
    state.offlineGeo = true;
  }
}

function fillDatalist(list, values) {
  list.innerHTML = values.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
}

function clearDatalist(list) {
  list.innerHTML = "";
}

function listIncludesLoose(values, value) {
  const normalizedValue = normalizeSearch(value);
  return values.some((item) => normalizeSearch(item) === normalizedValue);
}

function normalizeSearch(text) {
  return String(text || "")
    .toLocaleLowerCase("es-AR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
