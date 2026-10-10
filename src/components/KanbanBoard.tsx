import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useCRM } from "../context/CRMContext";
import {
  Order,
  OrderStatus,
  OrderPriority,
  SparePartInventoryItem,
} from "../types";
import { GeorefFields } from "./GeorefFields";
import { OrderForm } from "./OrderForm";
import { CustomSelect } from "./CustomSelect";
import { PatternLockInput } from "./PatternLockInput";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Search,
  Filter,
  Wrench,
  User,
  Phone,
  Clock,
  CheckCircle2,
  Plus,
  Trash2,
  Layers,
  Smartphone,
  Laptop,
  Gamepad2,
  Tv,
  AlertCircle,
  FileText,
  DollarSign,
  Briefcase,
  X,
  MapPin,
  Calendar,
  CalendarRange,
  Save,
  Lock,
  Tablet,
  Cpu,
  Printer,
  Watch,
  Speaker,
  Microwave,
  Box,
  MessageSquare,
  Share2,
  Check,
  Home,
  FolderOpen,
} from "lucide-react";


interface KanbanBoardProps {
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  activeOrderTab: OrderStatus;
  setActiveOrderTab: (tab: OrderStatus) => void;
  setActiveTab: (tab: string) => void;
  openNewOrderModal?: boolean;
  setOpenNewOrderModal?: (open: boolean) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  selectedOrderId,
  setSelectedOrderId,
  activeOrderTab,
  setActiveOrderTab,
  setActiveTab,
  openNewOrderModal,
  setOpenNewOrderModal,
}) => {
  const {
    orders,
    clients,
    inventory,
    updateOrderStatus,
    updateOrderDetails,
    deleteOrder,
    addPartToOrder,
    removePartFromOrder,
    delayConfig,
    updateDelayConfig,
    addInventoryItem,
    updateInventoryItem,
    updateClientDetails,
    technicians,
    showToast,
    categoryMargins,
    addCategory,
    exchangeRate,
    workshopName,
    workshopLogo,
    logoPosition,
    ticketTitle,
    ticketSub,
    ticketTerms,
    activeDeviceTypes,
  } = useCRM();

  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [unpaidFilter, setUnpaidFilter] = useState(false);

  // Month and Date range filters
  const [selectedMonth, setSelectedMonth] = useState<string>("all"); // format: 'YYYY-MM' or 'all'
  const [startDate, setStartDate] = useState<string>(""); // YYYY-MM-DD
  const [endDate, setEndDate] = useState<string>(""); // YYYY-MM-DD

  // Generate available unique months from orders dynamically
  const availableMonths = React.useMemo(() => {
    const months = new Set<string>();

    // Always pre-populate the current month and last month to make sure they are available!
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    months.add(currentMonthStr);

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
    months.add(lastMonthStr);

    // Add months from actual orders
    orders.forEach((o) => {
      if (o.createdAt) {
        try {
          const d = new Date(o.createdAt);
          if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            months.add(`${y}-${m}`);
          }
        } catch (_) {}
      }
    });

    return Array.from(months).sort((a, b) => b.localeCompare(a)); // Sort descending (newest month first)
  }, [orders]);

  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 15);
    const monthName = date.toLocaleDateString("es-AR", { month: "long" });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1) + " " + year;
  };

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrderForModal, setSelectedOrderForModal] =
    useState<Order | null>(null);
  const [showDeleteTicketConfirm, setShowDeleteTicketConfirm] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [paymentDropdownOrderId, setPaymentDropdownOrderId] = useState<string | null>(null);

  // New floating service intake modal
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [isClientModalSubOpen, setIsClientModalSubOpen] = useState(false);

  useEffect(() => {
    if (openNewOrderModal) {
      setIsNewServiceModalOpen(true);
      if (setOpenNewOrderModal) {
        setOpenNewOrderModal(false);
      }
    }
  }, [openNewOrderModal, setOpenNewOrderModal]);

  useEffect(() => {
    if (!paymentDropdownOrderId) return;
    const handler = () => setPaymentDropdownOrderId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [paymentDropdownOrderId]);

  // Delay Config panel states
  const [showDelayConfigPanel, setShowDelayConfigPanel] = useState(false);
  const [tempPendingDays, setTempPendingDays] = useState(
    delayConfig.pendingThresholdDays,
  );
  const [tempReadyDays, setTempReadyDays] = useState(
    delayConfig.readyThresholdDays,
  );

  // States for adding part inside the details editor
  const [selectedPartId, setSelectedPartId] = useState("");
  const [partQuantity, setPartQuantity] = useState(1);
  const [diagnosticsTemp, setDiagnosticsTemp] = useState("");
  const [workPerformedTemp, setWorkPerformedTemp] = useState("");
  const [laborCostTemp, setLaborCostTemp] = useState(0);
  const [paymentStatusTemp, setPaymentStatusTemp] = useState<"Pendiente" | "Parcial" | "Pagado">("Pendiente");
  const [amountPaidTemp, setAmountPaidTemp] = useState(0);

  // States for live inline client and device editing inside diagnostic view
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editClientName, setEditClientName] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [editClientPhone2, setEditClientPhone2] = useState("");
  const [editClientDocumentId, setEditClientDocumentId] = useState("");
  const [editClientProvincia, setEditClientProvincia] = useState("");
  const [editClientLocalidad, setEditClientLocalidad] = useState("");
  const [editClientAddress, setEditClientAddress] = useState("");
  const [editClientComments, setEditClientComments] = useState("");

  const [isEditingDevice, setIsEditingDevice] = useState(false);
  const [editDeviceType, setEditDeviceType] = useState("");
  const [editDeviceBrand, setEditDeviceBrand] = useState("");
  const [editDeviceModel, setEditDeviceModel] = useState("");
  const [editDeviceSerialNumber, setEditDeviceSerialNumber] = useState("");
  const [editReportedProblem, setEditReportedProblem] = useState("");
  const [editPlannedWork, setEditPlannedWork] = useState("");
  const [editDevicePassword, setEditDevicePassword] = useState("");
  const [editDevicePattern, setEditDevicePattern] = useState("");

  // WhatsApp Share and template management state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTemplateType, setShareTemplateType] = useState<"ingreso" | "diagnostico" | "listo" | "entregado">("ingreso");
  const [shareCustomText, setShareCustomText] = useState("");
  const [copiedShareText, setCopiedShareText] = useState(false);
  const [isEditingTemplatesMode, setIsEditingTemplatesMode] = useState(false);
  const [editingTemplateType, setEditingTemplateType] = useState<"ingreso" | "diagnostico" | "listo" | "entregado">("ingreso");
  const [editTemplateText, setEditTemplateText] = useState("");
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const [whatsappTemplates, setWhatsappTemplates] = useState<{
    ingreso: string;
    diagnostico: string;
    listo: string;
    entregado: string;
  }>(() => {
    const saved = localStorage.getItem("crm_whatsapp_templates");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ingreso: parsed.ingreso || `Estimado/a *{cliente}*,\n\nLe informamos que su *{dispositivo} {marca_modelo}* ha sido ingresado correctamente en nuestro servicio técnico con el Ticket *#{ticket}*.\n\n*Problema reportado:* {problema}\n*Técnico asignado:* {tecnico}\n\nPuede consultar el avance de su reparación en cualquier momento citando este nro de ticket.\n\n¡Muchas gracias por su confianza!`,
          diagnostico: parsed.diagnostico || `Estimado/a *{cliente}*,\n\nLe enviamos el diagnóstico para su Ticket *#{ticket}* (*{dispositivo} {marca_modelo}*):\n\n*Presupuesto total:* {presupuesto} {info_mano_obra}{info_repuestos}\n\n*Notas de diagnóstico:* {notas}\n\nPor favor, respóndanos a este mensaje para confirmar si aprueba la reparación y podemos comenzar el trabajo.\n\nQuedamos a su disposición.`,
          listo: parsed.listo || `Estimado/a *{cliente}*,\n\n¡Le tenemos excelentes noticias! Su equipo *{dispositivo} {marca_modelo}* (Ticket *#{ticket}*) ha sido reparado con éxito y ya está *LISTO PARA RETIRAR* en nuestro local.{trabajos_realizados}{info_mano_obra_listo}{info_repuestos_listo}\n\n*Costo total final:* {presupuesto}\n\nPuede pasar de lunes a viernes en nuestro horario de atención comercial.\n\n¡Lo/a esperamos!`,
          entregado: parsed.entregado || `Estimado/a *{cliente}*,\n\nRegistramos que su equipo *{dispositivo} {marca_modelo}* (Ticket *#{ticket}*) ha sido entregado exitosamente.\n\n¡Agradecemos mucho haber elegido nuestro servicio de reparación! Si tiene alguna consulta o necesita asistencia adicional, quedamos a su entera disposición.`
        };
      } catch (e) {
        // ignore fallback
      }
    }
    return {
      ingreso: `Estimado/a *{cliente}*,\n\nLe informamos que su *{dispositivo} {marca_modelo}* ha sido ingresado correctamente en nuestro servicio técnico con el Ticket *#{ticket}*.\n\n*Problema reportado:* {problema}\n*Técnico asignado:* {tecnico}\n\nPuede consultar el avance de su reparación en cualquier momento citando este nro de ticket.\n\n¡Muchas gracias por su confianza!`,
      diagnostico: `Estimado/a *{cliente}*,\n\nLe enviamos el diagnóstico para su Ticket *#{ticket}* (*{dispositivo} {marca_modelo}*):\n\n*Presupuesto total:* {presupuesto} {info_mano_obra}{info_repuestos}\n\n*Notas de diagnóstico:* {notas}\n\nPor favor, respóndanos a este mensaje para confirmar si aprueba la reparación y podemos comenzar el trabajo.\n\nQuedamos a su disposición.`,
      listo: `Estimado/a *{cliente}*,\n\n¡Le tenemos excelentes noticias! Su equipo *{dispositivo} {marca_modelo}* (Ticket *#{ticket}*) ha sido reparado con éxito y ya está *LISTO PARA RETIRAR* en nuestro local.{trabajos_realizados}{info_mano_obra_listo}{info_repuestos_listo}\n\n*Costo total final:* {presupuesto}\n\nPuede pasar de lunes a viernes en nuestro horario de atención comercial.\n\n¡Lo/a esperamos!`,
      entregado: `Estimado/a *{cliente}*,\n\nRegistramos que su equipo *{dispositivo} {marca_modelo}* (Ticket *#{ticket}*) ha sido entregado exitosamente.\n\n¡Agradecemos mucho haber elegido nuestro servicio de reparación! Si tiene alguna consulta o necesita asistencia adicional, quedamos a su entera disposición.`
    };
  });

  const getWhatsAppMessage = (
    order: Order,
    type: "ingreso" | "diagnostico" | "listo" | "entregado"
  ): string => {
    const brandModel = `${order.brand || ""} ${order.model || ""}`.trim() || "Dispositivo";
    const totalEst = order.totalCost
      ? `$${order.totalCost.toLocaleString("es-AR")}`
      : "A definir";
    const laborEst = order.laborCost
      ? `$${order.laborCost.toLocaleString("es-AR")}`
      : "$0";
    const infoManoObra = order.laborCost
      ? `(Mano de obra: $${order.laborCost.toLocaleString("es-AR")})`
      : "";
    const partsNames =
      order.partsUsed && order.partsUsed.length > 0
        ? `\n*Repuestos vinculados:*\n` + order.partsUsed.map((p) => `• ${p.name} (x${p.quantity})`).join("\n")
        : "";

    const trabajosRealizados = order.workPerformed
      ? `\n\n*Trabajos realizados:* ${order.workPerformed}`
      : "";

    const infoManoObraListo = order.laborCost
      ? `\n*Mano de obra:* $${order.laborCost.toLocaleString("es-AR")}`
      : "";

    const infoRepuestosListo =
      order.partsUsed && order.partsUsed.length > 0
        ? `\n*Repuestos utilizados:*\n` + order.partsUsed.map((p) => `• ${p.name} (x${p.quantity}) - $${(p.price * p.quantity).toLocaleString("es-AR")}`).join("\n")
        : "";

    const selectedTemplate = whatsappTemplates[type] || "";

    return selectedTemplate
      .replace(/{cliente}/g, order.clientName)
      .replace(/{telefono}/g, order.clientPhone || "")
      .replace(/{dispositivo}/g, order.deviceType)
      .replace(/{marca_modelo}/g, brandModel)
      .replace(/{ticket}/g, order.id)
      .replace(/{problema}/g, order.reportedProblem || order.description || "Pendiente de diagnóstico")
      .replace(/{trabajos_realizados}/g, trabajosRealizados)
      .replace(/{trabajo_realizado}/g, order.workPerformed || "")
      .replace(/{tecnico}/g, order.assignedTechnician || "Por asignar")
      .replace(/{presupuesto}/g, totalEst)
      .replace(/{mano_obra}/g, laborEst)
      .replace(/{info_mano_obra}/g, infoManoObra)
      .replace(/{info_mano_obra_listo}/g, infoManoObraListo)
      .replace(/{info_repuestos_listo}/g, infoRepuestosListo)
      .replace(/{info_repuestos}/g, partsNames)
      .replace(/{repuestos}/g, partsNames)
      .replace(/{notas}/g, order.diagnosticNotes || "");
  };

  // Part search and fast creation state
  const [partFilterQuery, setPartFilterQuery] = useState("");
  const [isPartDropdownOpen, setIsPartDropdownOpen] = useState(false);
  const [stockEditId, setStockEditId] = useState<string | null>(null);
  const [stockEditQty, setStockEditQty] = useState(1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showNewPartForm, setShowNewPartForm] = useState(false);
  const [newPartName, setNewPartName] = useState("");
  const [newPartSku, setNewPartSku] = useState("");
  const [newPartCategory, setNewPartCategory] = useState("Otro");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newPartIva, setNewPartIva] = useState<"Exento" | "10.5%" | "21.0%">(
    "Exento",
  );
  const [newPartCurrency, setNewPartCurrency] = useState<"ARS" | "USD">("ARS");
  const [newPartPricingType, setNewPartPricingType] = useState<
    "margin" | "manual"
  >("manual");
  const [newPartCostPrice, setNewPartCostPrice] = useState<number>(0);
  const [newPartMarginPercent, setNewPartMarginPercent] = useState<number>(35);
  const [newPartFinalPrice, setNewPartFinalPrice] = useState<number>(0);
  const [newPartStock, setNewPartStock] = useState<number>(5);
  const [newPartCompatible, setNewPartCompatible] = useState("");

  const statuses: OrderStatus[] = [
    "Ingresado",
    "En Reparación",
    "Listo",
    "Entregado",
  ];
  const [expandedCardIds, setExpandedCardIds] = useState<
    Record<string, boolean>
  >({});

  const handleCategoryChange = (cat: string) => {
    setNewPartCategory(cat);
    if (newPartPricingType === "margin") {
      const margin = categoryMargins[cat] || 35;
      setNewPartMarginPercent(margin);
      setNewPartFinalPrice(Math.round(newPartCostPrice * (1 + margin / 100)));
    }
  };

  const handlePricingTypeChange = (type: "margin" | "manual") => {
    setNewPartPricingType(type);
    if (type === "margin") {
      const margin = categoryMargins[newPartCategory] || 35;
      setNewPartMarginPercent(margin);
      setNewPartFinalPrice(Math.round(newPartCostPrice * (1 + margin / 100)));
    }
  };

  const handleCostPriceChange = (cost: number) => {
    setNewPartCostPrice(cost);
    if (newPartPricingType === "margin") {
      setNewPartFinalPrice(Math.round(cost * (1 + newPartMarginPercent / 100)));
    }
  };

  const handleMarginPercentChange = (margin: number) => {
    setNewPartMarginPercent(margin);
    if (newPartPricingType === "margin") {
      setNewPartFinalPrice(Math.round(newPartCostPrice * (1 + margin / 100)));
    }
  };

  const handleFinalPriceChange = (price: number) => {
    setNewPartFinalPrice(price);
  };

  const toggleCardExpansion = (orderId: string) => {
    setExpandedCardIds((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  // Handle clicking outside the custom select dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsPartDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Helper calculation for delays
  const getOrderDelayStatus = (order: Order) => {
    const now = new Date();

    if (order.status === "Ingresado") {
      const createdDate = new Date(order.createdAt);
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= delayConfig.pendingThresholdDays) {
        return {
          isDelayed: true,
          type: "pending_delay",
          label: `Revisión demorada (${diffDays}d)`,
          days: diffDays,
          color:
            "bg-amber-100/90 text-amber-900 border-amber-300 ring-1 ring-amber-400/20",
        };
      }
    } else if (order.status === "Listo") {
      const updatedDate = new Date(order.updatedAt);
      const diffTime = Math.abs(now.getTime() - updatedDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= delayConfig.readyThresholdDays) {
        return {
          isDelayed: true,
          type: "ready_delay",
          label: `Retiro demorado (${diffDays}d)`,
          days: diffDays,
          color:
            "bg-rose-100 text-rose-900 border-rose-300 ring-1 ring-rose-400/20",
        };
      }
    }
    return { isDelayed: false, type: null, label: "", days: 0, color: "" };
  };

  const getDefaultTechnician = (): string => {
    if (technicians.length === 0) return "";
    if (technicians.length === 1) return technicians[0].name;
    const lastAssigned = [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .find(o => o.assignedTechnician && technicians.some(t => t.name === o.assignedTechnician));
    return lastAssigned?.assignedTechnician || technicians[0].name;
  };

  // Handle opening technical details editor
  const openOrderDetails = (order: Order) => {
    let orderToOpen = order;
    if (!order.assignedTechnician && technicians.length > 0) {
      const defaultTech = getDefaultTechnician();
      if (defaultTech) {
        updateOrderDetails(order.id, { assignedTechnician: defaultTech });
        orderToOpen = { ...order, assignedTechnician: defaultTech };
      }
    }
    setSelectedOrderForModal(orderToOpen);
    setSelectedOrderId(orderToOpen.id);
    setDiagnosticsTemp(order.diagnosticNotes || "");
    setWorkPerformedTemp(order.workPerformed || "");
    setLaborCostTemp(order.laborCost);
    setPaymentStatusTemp(order.paymentStatus || "Pendiente");
    setAmountPaidTemp(order.amountPaid || 0);

    // Initialize temporary edit states from the client record (authoritative source)
    const matchingClient = clients.find((c) => c.id === order.clientId);
    setEditClientName(matchingClient?.name || order.clientName || "");
    setEditClientPhone(matchingClient?.phone || order.clientPhone || "");
    setIsEditingClient(false);

    if (matchingClient) {
      setEditClientPhone2(matchingClient.phone2 || "");
      setEditClientDocumentId(matchingClient.documentId || "");
      setEditClientProvincia(matchingClient.provincia || "");
      setEditClientLocalidad(matchingClient.localidad || "");
      setEditClientAddress(matchingClient.address || "");
      setEditClientComments(matchingClient.comments || "");
    } else {
      setEditClientPhone2("");
      setEditClientDocumentId("");
      setEditClientProvincia("");
      setEditClientLocalidad("");
      setEditClientAddress("");
      setEditClientComments("");
    }

    setEditDeviceType(order.deviceType || "");
    setEditDeviceBrand(order.brand || "");
    setEditDeviceModel(order.model || "");
    setEditDeviceSerialNumber(order.serialNumber || "");
    setEditReportedProblem(order.reportedProblem || order.description || "");
    setEditPlannedWork(order.plannedWork || "");
    setIsEditingDevice(false);

    setIsDetailOpen(true);
  };

  const closeOrderDetails = () => {
    setIsDetailOpen(false);
    setSelectedOrderForModal(null);
    setSelectedOrderId(null);
    setSelectedPartId("");
    setPartFilterQuery("");
    setIsPartDropdownOpen(false);
    setPartQuantity(1);
    setShowDeleteTicketConfirm(false);
  };

  useEffect(() => {
    if (
      selectedOrderId &&
      (!selectedOrderForModal || selectedOrderForModal.id !== selectedOrderId)
    ) {
      const order = orders.find((o) => o.id === selectedOrderId);
      if (order) {
        openOrderDetails(order);
      }
    }
  }, [selectedOrderId, orders]);

  // Quick actions to shift order status from the Kanban list
  const handleShiftStatus = (
    orderId: string,
    currentStatus: OrderStatus,
    direction: "forward" | "backward",
  ) => {
    const currentIndex = statuses.indexOf(currentStatus);
    let nextIndex = currentIndex;

    if (direction === "forward" && currentIndex < statuses.length - 1) {
      nextIndex = currentIndex + 1;
    } else if (direction === "backward" && currentIndex > 0) {
      nextIndex = currentIndex - 1;
    }

    if (nextIndex !== currentIndex) {
      updateOrderStatus(orderId, statuses[nextIndex]);
      // If modal is open for this order, synchronize it too
      if (selectedOrderForModal && selectedOrderForModal.id === orderId) {
        setSelectedOrderForModal((prev) =>
          prev ? { ...prev, status: statuses[nextIndex] } : null,
        );
      }
    }
  };

  const handleApplyTechnicalEdit = () => {
    if (!selectedOrderForModal) return;

    const finalPaymentStatus = paymentStatusTemp === "Pagado" ? "Pagado" : paymentStatusTemp === "Parcial" ? "Parcial" : "Pendiente";
    const finalAmountPaid = finalPaymentStatus === "Pendiente" ? 0 : finalPaymentStatus === "Pagado"
      ? Number(laborCostTemp) + (selectedOrderForModal.partsUsed?.reduce((s, p) => s + p.price * p.quantity, 0) || 0)
      : Number(amountPaidTemp);

    updateOrderDetails(selectedOrderForModal.id, {
      diagnosticNotes: diagnosticsTemp,
      workPerformed: workPerformedTemp,
      laborCost: Number(laborCostTemp),
      paymentStatus: finalPaymentStatus,
      amountPaid: finalAmountPaid,
      plannedWork: editPlannedWork,
    });

    // Update local modal data
    setSelectedOrderForModal((prev) => {
      if (!prev) return null;
      const partsSum = prev.partsUsed.reduce(
        (sum, p) => sum + p.price * p.quantity,
        0,
      );
      return {
        ...prev,
        diagnosticNotes: diagnosticsTemp,
        workPerformed: workPerformedTemp,
        laborCost: Number(laborCostTemp),
        totalCost: Number(laborCostTemp) + partsSum,
        paymentStatus: finalPaymentStatus,
        amountPaid: finalAmountPaid,
        plannedWork: editPlannedWork,
      };
    });

    showToast("Detalles técnicos actualizados correctamente.", "success");
    closeOrderDetails();
  };

  const handleSaveClientEdit = () => {
    if (!selectedOrderForModal) return;

    // Update the clients database
    updateClientDetails(selectedOrderForModal.clientId, {
      name: editClientName,
      phone: editClientPhone,
      phone2: editClientPhone2,
      documentId: editClientDocumentId,
      provincia: editClientProvincia,
      localidad: editClientLocalidad,
      address: editClientAddress,
      comments: editClientComments,
    });

    // Synchronize the modal state with updated client values
    setSelectedOrderForModal((prev) =>
      prev
        ? {
            ...prev,
            clientName: editClientName,
            clientPhone: editClientPhone,
          }
        : null,
    );

    setIsEditingClient(false);
    showToast("Información del cliente actualizada correctamente.", "success");
  };

  const handleSaveDeviceEdit = () => {
    if (!selectedOrderForModal) return;

    const isSecDevice =
      editDeviceType === "Notebook" ||
      editDeviceType === "Celular" ||
      editDeviceType === "Tablet" ||
      editDeviceType === "CPU / PC Desktop";
    const isTouchDevice =
      editDeviceType === "Celular" || editDeviceType === "Tablet";

    const finalPassword = isSecDevice ? editDevicePassword : "";
    const finalPattern = isTouchDevice ? editDevicePattern : "";

    // Update the order in context
    updateOrderDetails(selectedOrderForModal.id, {
      deviceType: editDeviceType,
      brand: editDeviceBrand,
      model: editDeviceModel,
      serialNumber: editDeviceSerialNumber,
      description: editReportedProblem,
      reportedProblem: editReportedProblem,
      plannedWork: editPlannedWork,
      devicePassword: finalPassword,
      devicePattern: finalPattern,
    });

    // Synchronize the modal state with updated device values
    setSelectedOrderForModal((prev) =>
      prev
        ? {
            ...prev,
            deviceType: editDeviceType,
            brand: editDeviceBrand,
            model: editDeviceModel,
            serialNumber: editDeviceSerialNumber,
            description: editReportedProblem,
            reportedProblem: editReportedProblem,
            plannedWork: editPlannedWork,
            devicePassword: finalPassword,
            devicePattern: finalPattern,
          }
        : null,
    );

    setIsEditingDevice(false);
    showToast(
      "Especificación del equipo y datos de ingreso actualizados correctamente.",
      "success",
    );
  };

  const handleAddPart = () => {
    if (!selectedOrderForModal || !selectedPartId) return;

    const ok = addPartToOrder(
      selectedOrderForModal.id,
      selectedPartId,
      Number(partQuantity),
    );
    if (ok) {
      // Find updated state to refresh modal view
      const updatedOrder = orders.find(
        (o) => o.id === selectedOrderForModal.id,
      );
      if (updatedOrder) {
        // Since react updates asynchronously, merge manually to avoid stale state in modal
        const partObj = inventory.find((i) => i.id === selectedPartId);
        if (partObj) {
          const updatedPartsUsed = [...selectedOrderForModal.partsUsed];
          const existIdx = updatedPartsUsed.findIndex(
            (p) => p.id === selectedPartId,
          );

          if (existIdx > -1) {
            updatedPartsUsed[existIdx] = {
              ...updatedPartsUsed[existIdx],
              quantity:
                updatedPartsUsed[existIdx].quantity + Number(partQuantity),
            };
          } else {
            updatedPartsUsed.push({
              id: selectedPartId,
              name: partObj.name,
              price: partObj.price,
              costPrice:
                partObj.costPrice !== undefined
                  ? partObj.costPrice
                  : Math.round(partObj.price * 0.7),
              quantity: Number(partQuantity),
            });
          }

          const partsSum = updatedPartsUsed.reduce(
            (sum, p) => sum + p.price * p.quantity,
            0,
          );
          const labor = Number(laborCostTemp);
          setSelectedOrderForModal({
            ...selectedOrderForModal,
            partsUsed: updatedPartsUsed,
            totalCost: partsSum + labor,
          });
        }
      }
      setSelectedPartId("");
      setPartFilterQuery("");
      setIsPartDropdownOpen(false);
      setPartQuantity(1);
    } else {
      showToast(
        "Error: Stock insuficiente para asignar este repuesto.",
        "error",
      );
    }
  };

  const handleRemovePart = (partId: string) => {
    if (!selectedOrderForModal) return;

    removePartFromOrder(selectedOrderForModal.id, partId);

    // Dynamic state feedback in modal
    const updatedPartsUsed = selectedOrderForModal.partsUsed.filter(
      (p) => p.id !== partId,
    );
    const partsSum = updatedPartsUsed.reduce(
      (sum, p) => sum + p.price * p.quantity,
      0,
    );
    const labor = Number(laborCostTemp);

    setSelectedOrderForModal({
      ...selectedOrderForModal,
      partsUsed: updatedPartsUsed,
      totalCost: partsSum + labor,
    });
  };

  // Filters application
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.deviceType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority =
      priorityFilter === "all" || order.priority === priorityFilter;

    // Month filter
    let matchesMonth = true;
    if (selectedMonth !== "all") {
      const orderDate = new Date(order.createdAt);
      const year = orderDate.getFullYear();
      const month = String(orderDate.getMonth() + 1).padStart(2, "0");
      const orderMonthStr = `${year}-${month}`;
      matchesMonth = orderMonthStr === selectedMonth;
    }

    // Date range filter
    let matchesDateRange = true;
    if (startDate) {
      const orderDate = new Date(order.createdAt);
      const filterStart = new Date(startDate + "T00:00:00");
      matchesDateRange = matchesDateRange && orderDate >= filterStart;
    }
    if (endDate) {
      const orderDate = new Date(order.createdAt);
      const filterEnd = new Date(endDate + "T23:59:59");
      matchesDateRange = matchesDateRange && orderDate <= filterEnd;
    }

    const matchesUnpaid = !unpaidFilter || (order.totalCost > 0 && (order.paymentStatus || 'Pendiente') !== 'Pagado');

    return matchesSearch && matchesPriority && matchesMonth && matchesDateRange && matchesUnpaid;
  });

  // Get orders by status
  const getOrdersByStatus = (status: OrderStatus) => {
    const result = filteredOrders.filter((order) => order.status === status);
    result.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    return result;
  };

  // Helper colors for statuses inside Kanban
  const getStatusColorTheme = (status: OrderStatus) => {
    switch (status) {
      case "Ingresado":
        return {
          bg: "bg-zinc-50 border-t-zinc-400",
          indicator: "bg-zinc-500 text-zinc-800",
          badge: "bg-zinc-100 text-zinc-800 border-zinc-200",
        };
      case "En Reparación":
        return {
          bg: "bg-blue-50/20 border-t-blue-500",
          indicator: "bg-blue-600 text-blue-800",
          badge: "bg-blue-50 text-blue-700 border-blue-100",
        };
      case "Listo":
        return {
          bg: "bg-emerald-50/20 border-t-emerald-500",
          indicator: "bg-emerald-600 text-emerald-800",
          badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
        };
      case "Entregado":
      default:
        return {
          bg: "bg-indigo-50/10 border-t-indigo-500 opacity-90",
          indicator: "bg-indigo-600 text-indigo-800",
          badge: "bg-indigo-50 text-indigo-700 border-indigo-100",
        };
    }
  };

  // Helper priorities styling
  const getPriorityStyle = (priority: OrderPriority) => {
    switch (priority) {
      case "Crítica":
        return "bg-rose-100 text-rose-800 border border-rose-200 font-bold";
      case "Alta":
        return "bg-amber-100 text-amber-800 border border-amber-200";
      case "Media":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      default:
        return "bg-slate-100 text-slate-600 border border-slate-200";
    }
  };

  // Helper render device icon
  const getDeviceIcon = (dev: string) => {
    const clean = dev
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (
      clean.includes("telefono") ||
      clean.includes("celular") ||
      clean.includes("smartphone") ||
      clean.includes("movil") ||
      clean.includes("phone")
    )
      return <Smartphone className="h-4 w-4" />;
    if (
      clean.includes("notebook") ||
      clean.includes("netbook") ||
      clean.includes("laptop") ||
      clean.includes("portatil") ||
      clean.includes("macbook")
    )
      return <Laptop className="h-4 w-4" />;
    if (clean.includes("tablet") || clean.includes("ipad"))
      return <Tablet className="h-4 w-4" />;
    if (
      clean.includes("pc") ||
      clean.includes("cpu") ||
      clean.includes("desktop") ||
      clean.includes("computadora") ||
      clean.includes("all-in-one") ||
      clean.includes("all in one")
    )
      return <Cpu className="h-4 w-4" />;
    if (
      clean.includes("televisor") ||
      clean.includes("tv") ||
      clean.includes("monitor") ||
      clean.includes("pantalla")
    )
      return <Tv className="h-4 w-4" />;
    if (clean.includes("impresora") || clean.includes("printer"))
      return <Printer className="h-4 w-4" />;
    if (
      clean.includes("consola") ||
      clean.includes("videojuego") ||
      clean.includes("playstation") ||
      clean.includes("ps4") ||
      clean.includes("ps5") ||
      clean.includes("xbox") ||
      clean.includes("nintendo") ||
      clean.includes("gamepad")
    )
      return <Gamepad2 className="h-4 w-4" />;
    if (
      clean.includes("smartwatch") ||
      clean.includes("reloj") ||
      clean.includes("watch")
    )
      return <Watch className="h-4 w-4" />;
    if (
      clean.includes("radio") ||
      clean.includes("audio") ||
      clean.includes("parlante") ||
      clean.includes("speaker")
    )
      return <Speaker className="h-4 w-4" />;
    if (clean.includes("microondas") || clean.includes("horno"))
      return <Microwave className="h-4 w-4" />;
    return <Box className="h-4 w-4" />; // default
  };

  const renderTechnicianAssignment = () => {
    if (!selectedOrderForModal) return null;
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3 animate-fade-in">
        <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/65">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Técnico Asignado de Servicio
          </h4>
        </div>
        <div className="text-xs">
          <label className="text-[10.5px] font-bold text-slate-500 block mb-1">
            Cambiar Técnico Asignado:
          </label>
          <CustomSelect
            value={selectedOrderForModal.assignedTechnician}
            onChange={(val) => {
              if (val) {
                updateOrderDetails(selectedOrderForModal.id, {
                  assignedTechnician: val,
                });
                setSelectedOrderForModal((prev) =>
                  prev ? { ...prev, assignedTechnician: val } : null,
                );
              }
            }}
            className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
            options={
              technicians.length === 0
                ? [
                    {
                      value: "",
                      label: "-- No hay técnicos disponibles --",
                    },
                  ]
                : technicians.map((tech) => ({
                    value: tech.name,
                    label: tech.name,
                  }))
            }
          />
        </div>
      </div>
    );
  };

  return (
    <div
      id="kanban-board-module"
      className="space-y-6 animate-fade-in flex flex-col h-full"
    >
      {/* Header with title and prominent primary call-to-action */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Tablero de Diagnósticos y Soporte
          </h2>
          <p className="text-slate-500 text-sm">
            Organiza las órdenes por estado, asigna piezas y guarda notas
            técnicas.
          </p>
        </div>

        <div className="shrink-0">
          <button
            onClick={() => setIsNewServiceModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4.5 rounded-xl flex items-center space-x-2 transition shadow-sm hover:shadow active:scale-98 cursor-pointer select-none"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Service</span>
          </button>
        </div>
      </div>

      {/* Delay / Intermediate States Config Modal */}
      {showDelayConfigPanel && (
        <div
          id="delay-config-modal"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in"
        >
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-5 animate-slide-up">
            <div className="flex justify-between items-center pb-3.5 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-50 rounded-xl">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Configurar Alertas de Demora
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Tiempos máximos tolerados para estados intermedios
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDelayConfigPanel(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-all cursor-pointer"
              >
                <span className="sr-only">Cerrar</span>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/50 space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Alerta de "Revisión demorada"
                </label>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Si un equipo ingresa como{" "}
                  <span className="font-semibold text-slate-600">
                    "Ingresado"
                  </span>{" "}
                  y no cambia de estado en este plazo, se destacará como demora
                  de diagnóstico.
                </p>
                <div className="flex items-center space-x-2.5 pt-1">
                  <input
                    type="number"
                    min={1}
                    value={tempPendingDays}
                    onChange={(e) =>
                      setTempPendingDays(
                        Math.max(1, parseInt(e.target.value) || 1),
                      )
                    }
                    className="w-18 text-xs p-2 border border-slate-200/60 rounded-lg text-center font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition"
                  />
                  <span className="text-xs text-slate-600 font-medium">
                    días transcurridos o más
                  </span>
                </div>
              </div>

              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/50 space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Alerta de "Retiro demorado"
                </label>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Si un equipo está marcado como{" "}
                  <span className="font-semibold text-slate-600">"Listo"</span>{" "}
                  y pasan estos días sin entregarse, se destacará como demora de
                  retiro.
                </p>
                <div className="flex items-center space-x-2.5 pt-1">
                  <input
                    type="number"
                    min={1}
                    value={tempReadyDays}
                    onChange={(e) =>
                      setTempReadyDays(
                        Math.max(1, parseInt(e.target.value) || 1),
                      )
                    }
                    className="w-18 text-xs p-2 border border-slate-200/60 rounded-lg text-center font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition"
                  />
                  <span className="text-xs text-slate-600 font-medium">
                    días transcurridos o más
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDelayConfigPanel(false)}
                className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60 font-bold text-xs py-2 px-4 rounded-xl transition cursor-pointer select-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  updateDelayConfig({
                    pendingThresholdDays: tempPendingDays,
                    readyThresholdDays: tempReadyDays,
                  });
                  setShowDelayConfigPanel(false);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-xs transition cursor-pointer select-none animate-pulse-subtle"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Filter Search Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        {/* Top toolbar row: Search Input & Alertas Configuration */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ticket, cliente, marca, modelo o tipo de dispositivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50/50 border border-slate-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white transition-all text-slate-700 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition p-1"
                title="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Delay settings trigger */}
          <button
            onClick={() => {
              setTempPendingDays(delayConfig.pendingThresholdDays);
              setTempReadyDays(delayConfig.readyThresholdDays);
              setShowDelayConfigPanel(!showDelayConfigPanel);
            }}
            className={`px-3 py-2 text-xs rounded-lg font-bold border flex items-center justify-center space-x-1.5 transition-all cursor-pointer h-9.5 md:h-[38px] shrink-0 ${
              showDelayConfigPanel
                ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200/50 shadow-xs"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Configurar Alertas</span>
          </button>

        </div>

        {/* Date, Month and Priority filtration controls */}
        <div className="pt-3.5 border-t border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Priority filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mr-1 select-none">
              Prioridad:
            </span>
            <div className="bg-slate-50/80 p-0.5 rounded-lg flex space-x-1 border border-slate-200/40 shrink-0">
              {["all", "Baja", "Media", "Alta", "Crítica"].map((prio) => {
                const count = prio === "all"
                  ? orders.length
                  : orders.filter(o => o.priority === prio).length;
                return (
                  <button
                    key={prio}
                    onClick={() => { setPriorityFilter(prio); setUnpaidFilter(false); }}
                    className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition-all cursor-pointer select-none flex items-center space-x-1 ${
                      priorityFilter === prio && !unpaidFilter
                        ? prio === "Crítica"
                          ? "bg-rose-600 text-white shadow-xs"
                          : prio === "Alta"
                            ? "bg-amber-500 text-white shadow-xs"
                            : prio === "Media"
                              ? "bg-blue-600 text-white shadow-xs"
                              : prio === "Baja"
                                ? "bg-slate-600 text-white shadow-xs"
                                : "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-200/40 hover:text-slate-800"
                    }`}
                  >
                    <span>{prio === "all" ? "Todas" : prio}</span>
                    <span className={`text-[9px] font-bold px-1 py-px rounded-full leading-none ${
                      priorityFilter === prio && !unpaidFilter ? "bg-white/25" : "bg-slate-200/60 text-slate-500"
                    }`}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Separator + Pending payments filter */}
            {(() => {
              const unpaidCount = orders.filter(o => o.totalCost > 0 && (o.paymentStatus || 'Pendiente') !== 'Pagado').length;
              return unpaidCount > 0 ? (
                <>
                  <div className="w-px h-6 bg-slate-200 mx-1 shrink-0" />
                  <button
                    onClick={() => { setUnpaidFilter(!unpaidFilter); if (!unpaidFilter) setPriorityFilter("all"); }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer select-none ${
                      unpaidFilter
                        ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                        : "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                    }`}
                  >
                    Pendientes de cobro
                    <span className={`font-bold px-1.5 py-0.5 rounded-md text-[10px] ${
                      unpaidFilter
                        ? "bg-amber-600 text-white"
                        : "bg-amber-200 text-amber-800"
                    }`}>{unpaidCount}</span>
                  </button>
                </>
              ) : null;
            })()}
          </div>

          {/* Calendar and custom filters grouped */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
            {/* Filter by Month */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-semibold flex items-center">
                <Calendar className="h-3.5 w-3.5 text-slate-400 mr-1.5" />
                Filtrar por Mes:
              </span>
              <CustomSelect
                value={selectedMonth}
                onChange={(val) => {
                  setSelectedMonth(val);
                  // clear custom dates when selecting preset month
                  if (val !== "all") {
                    setStartDate("");
                    setEndDate("");
                  }
                }}
                className="text-xs p-1.5 bg-slate-50 border border-slate-200/50 rounded-lg text-slate-700 font-medium min-w-[150px]"
                options={[
                  { value: "all", label: "-- Todos los meses --" },
                  ...availableMonths.map((month) => ({
                    value: month,
                    label: formatMonthLabel(month),
                  })),
                ]}
              />
            </div>

            {/* Range of dates */}
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="text-xs text-slate-500 font-semibold flex items-center">
                <CalendarRange className="h-3.5 w-3.5 text-slate-400 mr-1.5" />
                Rango de fechas:
              </span>
              <div className="flex items-center space-x-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setSelectedMonth("all"); // Clear month filter if setting custom dates
                  }}
                  className="text-xs p-1.5 bg-slate-50 border border-slate-200/50 rounded-lg text-slate-700 font-medium focus:bg-white focus:outline-none cursor-pointer"
                />
                <span className="text-slate-400 text-xs">a</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setSelectedMonth("all"); // Clear month filter if setting custom dates
                  }}
                  className="text-xs p-1.5 bg-slate-50 border border-slate-200/50 rounded-lg text-slate-700 font-medium focus:bg-white focus:outline-none cursor-pointer"
                />
              </div>
              {(startDate || endDate || selectedMonth !== "all") && (
                <button
                  onClick={() => {
                    setSelectedMonth("all");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 cursor-pointer ml-1.5"
                >
                  Resetear fechas
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive responsive Kanban Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start mt-2">
        {statuses.map((status) => {
          const cardsInStatus = getOrdersByStatus(status);
          const theme = getStatusColorTheme(status);

          return (
            <div
              key={status}
              id={`kanban-column-${status}`}
              className="bg-slate-50 rounded-xl border border-slate-200 p-4 min-h-[450px] flex flex-col"
            >
              {/* Column Title */}
              <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${status === "Ingresado" ? "bg-zinc-400" : status === "En Reparación" ? "bg-blue-500" : status === "Listo" ? "bg-emerald-500" : status === "Entregado" ? "bg-indigo-500" : "bg-rose-500"}`}
                  />
                  <h3 className="font-bold text-slate-800 text-sm">{status}</h3>
                </div>
                <span className="px-2 py-0.5 text-xs font-bold leading-none bg-slate-200 text-slate-700 rounded-full">
                  {cardsInStatus.length}
                </span>
              </div>

              {/* Column Cards Stack */}
              <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[calc(100vh-320px)] md:max-h-[calc(100vh-285px)] lg:max-h-[calc(100vh-265px)] min-h-[340px] pr-1">
                {cardsInStatus.length === 0 ? (
                  <div className="h-32 rounded-lg border border-dashed border-slate-250 flex flex-col items-center justify-center p-4 text-center">
                    <Layers className="h-6 w-6 text-slate-300 mb-1" />
                    <span className="text-[11px] text-slate-400">
                      Sin órdenes en esta etapa
                    </span>
                  </div>
                ) : (
                  cardsInStatus.map((order) => {
                    const delayInfo = getOrderDelayStatus(order);
                    const isExpanded = !!expandedCardIds[order.id];

                    return (
                      <div
                        key={order.id}
                        id={`order-card-${order.id}`}
                        className={`block bg-white p-4.5 rounded-xl border-t-3 ${theme.bg} border border-slate-200 hover:shadow-md transition-all cursor-pointer group`}
                      >
                        {deletingOrderId === order.id ? (
                          <div className="flex flex-col items-center justify-center space-y-3 py-4 text-center">
                            <span className="text-rose-600 font-bold text-xs uppercase tracking-wider">
                              ¿Eliminar este ticket permanentemente?
                            </span>
                            <div className="flex justify-center space-x-2 w-full mt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteOrder(order.id);
                                  setDeletingOrderId(null);
                                }}
                                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] py-2 px-3 rounded transition"
                              >
                                Sí, borrar
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingOrderId(null);
                                }}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] py-2 px-3 rounded transition"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : !isExpanded ? (
                          /* Collapsed State */
                          <div
                            className="flex flex-col space-y-2"
                          >
                            <div
                              onClick={() => toggleCardExpansion(order.id)}
                              className="flex items-center space-x-1.5 text-slate-800 font-bold text-sm min-w-0"
                              title={`${order.deviceType} ${order.brand} ${order.model}`}
                            >
                              {getDeviceIcon(order.deviceType)}
                              <span className="truncate">
                                {order.deviceType} {order.brand} {order.model}
                              </span>
                              <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition shrink-0 ml-auto" />
                            </div>
                            <div className="flex items-center justify-between" onClick={() => toggleCardExpansion(order.id)}>
                              <p className="text-xs text-slate-500 font-medium truncate">
                                Cliente: {order.clientName}
                              </p>
                            </div>
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[9px] font-bold px-1.5 rounded h-[18px] inline-flex items-center ${getPriorityStyle(order.priority)}`}
                                >
                                  {order.priority}
                                </span>
                                {order.totalCost > 0 && (
                                  <div className="relative">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPaymentDropdownOrderId(paymentDropdownOrderId === order.id ? null : order.id);
                                      }}
                                      className={`text-[9px] font-bold px-1.5 rounded h-[18px] inline-flex items-center cursor-pointer transition hover:opacity-80 ${
                                        (order.paymentStatus || "Pendiente") === "Pagado"
                                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                          : (order.paymentStatus || "Pendiente") === "Parcial"
                                          ? "bg-amber-100 text-amber-700 border border-amber-200"
                                          : "bg-rose-100 text-rose-700 border border-rose-200"
                                      }`}
                                    >
                                      {(order.paymentStatus || "Pendiente") === "Pagado" ? "Pagado" : (order.paymentStatus || "Pendiente") === "Parcial" ? "Parcial" : "No pagado"}
                                    </button>
                                    {paymentDropdownOrderId === order.id && (
                                      <div className="absolute z-[70] left-0 bottom-full mb-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[100px]">
                                        {(["Pendiente", "Parcial", "Pagado"] as const).map(ps => (
                                          <button
                                            key={ps}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateOrderDetails(order.id, { paymentStatus: ps });
                                              setPaymentDropdownOrderId(null);
                                            }}
                                            className={`w-full text-left px-3 py-1.5 text-[11px] font-semibold transition ${
                                              (order.paymentStatus || "Pendiente") === ps
                                                ? "bg-slate-100 text-slate-800"
                                                : "hover:bg-slate-50 text-slate-600"
                                            }`}
                                          >
                                            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                                              ps === "Pagado" ? "bg-emerald-500" : ps === "Parcial" ? "bg-amber-500" : "bg-rose-500"
                                            }`} />
                                            {ps === "Pendiente" ? "No pagado" : ps}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openOrderDetails(order);
                                  }}
                                  className="text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 p-1 rounded transition"
                                  title="Abrir ficha de trabajo"
                                >
                                  <FolderOpen className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingOrderId(order.id);
                                  }}
                                  className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1 rounded transition"
                                  title="Eliminar ticket"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Expanded State */
                          <div className="space-y-3">
                            {/* Header that can be clicked to collapse */}
                            <div
                              onClick={() => toggleCardExpansion(order.id)}
                              className="flex justify-between items-start pb-2 border-b border-slate-100"
                            >
                              <span className="font-mono font-bold text-indigo-600 text-xs">
                                {order.id}
                              </span>
                              <div className="flex items-center space-x-1 shrink-0">
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getPriorityStyle(order.priority)}`}
                                >
                                  {order.priority}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openOrderDetails(order);
                                  }}
                                  className="text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 p-1 rounded transition"
                                  title="Abrir ficha de trabajo"
                                >
                                  <FolderOpen className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingOrderId(order.id);
                                  }}
                                  className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1 rounded transition"
                                  title="Eliminar ticket"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                                <ChevronDown className="h-4 w-4 text-slate-400 rotate-180 transition" />
                              </div>
                            </div>

                            {/* Body details */}
                            <div className="space-y-3">
                              <div
                                onClick={() => toggleCardExpansion(order.id)}
                              >
                                <div className="flex items-center space-x-1.5 text-slate-800 font-bold text-sm">
                                  {getDeviceIcon(order.deviceType)}
                                  <span>
                                    {order.deviceType} {order.brand} {order.model}
                                  </span>
                                </div>
                                {/* Owner Information Segment */}
                                <div className="bg-slate-50/50 rounded-xl p-3.5 border border-slate-200/50 space-y-2.5 my-2.5 shadow-2xs">
                                  <span className="text-[10px] font-bold text-slate-400 block border-b border-slate-200/60 pb-1 uppercase tracking-wider">
                                    Dueño / Cliente
                                  </span>
                                  <div className="space-y-1.5">
                                    <div className="flex items-center space-x-2 text-xs">
                                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                      <span className="font-bold text-slate-700">
                                        {order.clientName}
                                      </span>
                                    </div>
                                    {order.clientPhone && (
                                      <div className="flex items-center space-x-2 text-xs text-slate-500">
                                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                        <span className="font-mono">
                                          {order.clientPhone}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {order.devicePassword && (
                                  <div className="flex items-center space-x-2 text-[10.5px] bg-amber-50/60 border border-amber-200/50 rounded-lg px-2.5 py-1.5 mt-1">
                                    <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                    <span className="font-semibold text-amber-800">Contraseña:</span>
                                    <span className="font-mono font-bold text-amber-900">{order.devicePassword}</span>
                                  </div>
                                )}

                                {/* Warning delay if applicable */}
                                {delayInfo.isDelayed && (
                                  <div
                                    className={`text-[10px] font-bold px-2 py-1 rounded border flex items-center space-x-1 ${delayInfo.color} mt-2`}
                                  >
                                    <AlertCircle className="h-3.5 w-3.5 animate-pulse shrink-0 text-amber-600" />
                                    <span className="truncate">
                                      {delayInfo.label}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Problem reported & Work planned (COMPLETELY visible) */}
                              <div className="space-y-2">
                                <div>
                                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                                    Problema reportado (Ingreso)
                                  </span>
                                  <p className="text-slate-600 text-xs bg-slate-50/80 p-2.5 rounded border border-slate-100 whitespace-pre-wrap leading-relaxed">
                                    {order.reportedProblem || order.description}
                                  </p>
                                </div>
                                {order.plannedWork && (
                                  <div>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                                      Trabajos a realizar (Ingreso)
                                    </span>
                                    <p className="text-slate-600 text-xs bg-indigo-50/20 p-2.5 rounded border border-indigo-100/30 whitespace-pre-wrap leading-relaxed">
                                      {order.plannedWork}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Technician & cost info */}
                              <div
                                onClick={() => toggleCardExpansion(order.id)}
                                className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px] text-slate-400"
                              >
                                <span className="flex items-center font-medium truncate mr-2">
                                  <User className="h-3.5 w-3.5 mr-1 text-slate-400 shrink-0" />
                                  <span
                                    className="truncate"
                                    title={`Técnico asignado: ${order.assignedTechnician}`}
                                  >
                                    Tecnico asignado: {order.assignedTechnician}
                                  </span>
                                </span>
                                <span className="font-bold text-slate-700">
                                  {order.totalCost.toLocaleString("es-AR", {
                                    style: "currency",
                                    currency: "ARS",
                                    minimumFractionDigits: 0,
                                  })}
                                </span>
                              </div>

                            </div>
                          </div>
                        )}

                        {/* Transporter stage buttons */}
                        <div className="mt-3.5 pt-2 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 rounded p-1">
                          <button
                            disabled={status === "Ingresado"}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShiftStatus(
                                order.id,
                                order.status,
                                "backward",
                              );
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-20 transition-all cursor-pointer"
                            title="Retroceder estado"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                            Fase
                          </span>
                          <button
                            disabled={status === "Entregado"}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShiftStatus(
                                order.id,
                                order.status,
                                "forward",
                              );
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-20 transition-all cursor-pointer"
                            title="Avanzar estado"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* High Fidelity Detail modal / drawer */}
      {isDetailOpen && selectedOrderForModal && (
        <div
          id="order-details-modal"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl max-w-7xl w-full shadow-2xl border border-slate-200 flex flex-col overflow-hidden max-h-[95vh] md:max-h-[90vh] animate-slide-up">
            {/* Unified Top Header Bar */}
            <div className="bg-slate-900 text-white p-4.5 px-5 flex justify-between items-center shrink-0 border-b border-slate-800">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[10px] font-bold bg-indigo-600 text-white px-2.5 py-1 rounded-md tracking-wider uppercase">
                  Ficha de Diagnóstico
                </span>
                <h3 className="text-lg font-bold font-mono tracking-tight">
                  {selectedOrderForModal.id}
                </h3>
                <select
                  value={selectedOrderForModal.priority}
                  onChange={(e) => {
                    const newPrio = e.target.value as any;
                    updateOrderDetails(selectedOrderForModal.id, {
                      priority: newPrio,
                    });
                    setSelectedOrderForModal((prev) =>
                      prev ? { ...prev, priority: newPrio } : null,
                    );
                  }}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500 ${getPriorityStyle(selectedOrderForModal.priority)}`}
                  title="Cambiar prioridad"
                >
                  <option value="Baja">Prioridad Baja</option>
                  <option value="Media">Prioridad Media</option>
                  <option value="Alta">Prioridad Alta</option>
                  <option value="Crítica">Prioridad Crítica</option>
                </select>
                <span className="text-slate-400 text-xs font-medium">
                  | {selectedOrderForModal.deviceType}{" "}
                  {selectedOrderForModal.brand} {selectedOrderForModal.model}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Print Receipt Button */}
                <button
                  type="button"
                  onClick={() => {
                    setTimeout(() => {
                      window.print();
                    }, 50);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg transition border border-slate-700 cursor-pointer animate-fade-in whitespace-nowrap"
                  title="Imprimir Comprobante de Servicio"
                >
                  <Printer className="h-4 w-4 text-indigo-400" />
                  <span className="hidden sm:inline">Imprimir ticket</span>
                </button>

                {/* WhatsApp Notification Button */}
                <button
                  type="button"
                  onClick={() => {
                    let defaultType: "ingreso" | "diagnostico" | "listo" | "entregado" = "ingreso";
                    if (selectedOrderForModal.status === "Listo") defaultType = "listo";
                    else if (selectedOrderForModal.status === "Entregado") defaultType = "entregado";
                    else if (selectedOrderForModal.diagnosticNotes || selectedOrderForModal.workPerformed || selectedOrderForModal.totalCost) {
                      defaultType = "diagnostico";
                    }

                    setShareTemplateType(defaultType);
                    setShareCustomText(getWhatsAppMessage(selectedOrderForModal, defaultType));
                    setIsShareModalOpen(true);
                    setCopiedShareText(false);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 hover:text-emerald-200 text-xs font-semibold rounded-lg transition border border-emerald-800/40 cursor-pointer animate-fade-in whitespace-nowrap"
                  title="Enviar aviso al cliente por WhatsApp"
                >
                  <MessageSquare className="h-4 w-4 text-emerald-400" />
                  <span className="hidden sm:inline">Notificar Cliente</span>
                </button>

                <button
                  onClick={closeOrderDetails}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition border border-slate-700 cursor-pointer animate-fade-in"
                  title="Cerrar Ficha"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Scrolling Inner Container: Responsive Columns */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden min-h-0 bg-white items-stretch">
              {/* Column 1: Client & Equipment details */}
              <div className="flex-1 lg:flex-[1.1] min-w-0 p-5.5 border-b lg:border-b-0 lg:border-r border-slate-200 lg:overflow-y-auto space-y-5">
                {/* Client Info Block */}
                <div
                  className={`bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3 animate-fade-in ${isEditingClient ? "relative z-20" : "relative z-10"}`}
                >
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Detalles del Cliente
                    </h4>
                    {!isEditingClient ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditClientName(
                            selectedOrderForModal.clientName || "",
                          );
                          setEditClientPhone(
                            selectedOrderForModal.clientPhone || "",
                          );
                          const matchingClient = clients.find(
                            (c) => c.id === selectedOrderForModal.clientId,
                          );
                          if (matchingClient) {
                            setEditClientProvincia(
                              matchingClient.provincia || "",
                            );
                            setEditClientLocalidad(
                              matchingClient.localidad || "",
                            );
                          }
                          setIsEditingClient(true);
                        }}
                        className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                      >
                        Editar Cliente
                      </button>
                    ) : (
                      <div className="flex space-x-1.5">
                        <button
                          type="button"
                          onClick={handleSaveClientEdit}
                          className="text-[10.5px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded shadow-xs hover:bg-indigo-700 transition cursor-pointer"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingClient(false)}
                          className="text-[10.5px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded hover:bg-slate-300 transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>

                  {(() => {
                    const matchingClient = clients.find(
                      (c) => c.id === selectedOrderForModal.clientId,
                    );
                    if (!isEditingClient) {
                      return (
                        <div className="space-y-3 text-xs bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                            <div>
                              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider select-none mb-0.5">
                                Nombre:
                              </span>
                              <span className="font-semibold text-slate-800 text-sm">
                                {selectedOrderForModal.clientName}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider select-none mb-0.5">
                                DNI/CUIT:
                              </span>
                              <span className="font-mono text-slate-600 text-sm font-semibold">
                                {matchingClient?.documentId || "Sin registrar"}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider select-none mb-0.5">
                                Teléfono 1:
                              </span>
                              <span className="font-semibold text-slate-800 text-sm">
                                {matchingClient?.phone || selectedOrderForModal.clientPhone || "Sin registrar"}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider select-none mb-0.5">
                                Teléfono 2:
                              </span>
                              <span className="font-semibold text-slate-800 text-sm">
                                {matchingClient?.phone2 || "Sin registrar"}
                              </span>
                            </div>
                          </div>
                          
                          {(matchingClient?.provincia || matchingClient?.localidad || matchingClient?.address) && (
                            <div className="space-y-2 border-b border-slate-100 pb-3">
                              {(matchingClient?.provincia || matchingClient?.localidad) && (
                                <div className="flex items-center space-x-1.5 text-slate-600 font-medium">
                                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mr-1 select-none">Ubicación:</span>
                                  <span className="font-semibold text-slate-700">
                                    {[
                                      matchingClient?.localidad,
                                      matchingClient?.provincia,
                                    ]
                                      .filter(Boolean)
                                      .join(", ")}
                                  </span>
                                </div>
                              )}
                              {matchingClient?.address && (
                                <div className="flex items-center space-x-1.5 text-slate-600 font-medium">
                                  <Home className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mr-1 select-none">Dirección:</span>
                                  <span className="font-semibold text-slate-700">{matchingClient.address}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {matchingClient?.comments && (
                            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider select-none mb-1">
                                Comentarios de Cliente:
                              </span>
                              <p className="text-slate-705 font-medium whitespace-pre-wrap leading-relaxed">{matchingClient.comments}</p>
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      return (
                        <div className="space-y-3.5 text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10.5px] font-bold text-slate-900 block">
                                Nombre *
                              </label>
                              <input
                                type="text"
                                value={editClientName}
                                onChange={(e) => setEditClientName(e.target.value)}
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 font-semibold text-slate-700"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10.5px] font-semibold text-slate-500 block">
                                DNI/CUIT
                              </label>
                              <input
                                type="text"
                                value={editClientDocumentId}
                                onChange={(e) => setEditClientDocumentId(e.target.value)}
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 font-semibold text-slate-700 font-mono"
                                placeholder="Ej. 20-35432109-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10.5px] font-semibold text-slate-500 block">
                                Teléfono 1
                              </label>
                              <input
                                type="text"
                                value={editClientPhone}
                                onChange={(e) => setEditClientPhone(e.target.value)}
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 font-semibold text-slate-700"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10.5px] font-semibold text-slate-500 block">
                                Teléfono 2
                              </label>
                              <input
                                type="text"
                                value={editClientPhone2}
                                onChange={(e) => setEditClientPhone2(e.target.value)}
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 font-semibold text-slate-700"
                                placeholder="Móvil alternativo"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-200/60 pt-3">
                            <GeorefFields
                              provinciaValue={editClientProvincia}
                              setProvinciaValue={setEditClientProvincia}
                              localidadValue={editClientLocalidad}
                              setLocalidadValue={setEditClientLocalidad}
                              variant="indigo"
                              labelClassName="text-[10.5px] font-semibold text-slate-500 block"
                              inputClassName="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 text-slate-700 pr-9 transition font-semibold"
                            />
                          </div>

                          <div className="space-y-1 border-t border-slate-200/60 pt-3">
                            <label className="text-[10.5px] font-semibold text-slate-500 block">
                              Dirección
                            </label>
                            <input
                              type="text"
                              value={editClientAddress}
                              onChange={(e) => setEditClientAddress(e.target.value)}
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 font-semibold text-slate-700"
                              placeholder="Calle, Número, Piso dpto"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10.5px] font-semibold text-slate-500 block">
                              Comentarios
                            </label>
                            <textarea
                              rows={2}
                              value={editClientComments}
                              onChange={(e) => setEditClientComments(e.target.value)}
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 font-semibold text-slate-700"
                              placeholder="Notas o comentarios internos sobre el cliente..."
                            />
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* Device Intake Block */}
                <div
                  className={`bg-slate-50 border border-slate-200 rounded-xl p-4.5 mb-5 space-y-3 animate-fade-in ${isEditingDevice ? "relative z-20" : "relative z-10"}`}
                >
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Especificación de Equipo
                    </h4>
                    {!isEditingDevice ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditDeviceType(
                            selectedOrderForModal.deviceType || "",
                          );
                          setEditDeviceBrand(selectedOrderForModal.brand || "");
                          setEditDeviceModel(selectedOrderForModal.model || "");
                          setEditDeviceSerialNumber(
                            selectedOrderForModal.serialNumber || "",
                          );
                          setEditDevicePassword(
                            selectedOrderForModal.devicePassword || "",
                          );
                          setEditDevicePattern(
                            selectedOrderForModal.devicePattern || "",
                          );
                          setIsEditingDevice(true);
                        }}
                        className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                      >
                        Editar Equipo
                      </button>
                    ) : (
                      <div className="flex space-x-1.5">
                        <button
                          type="button"
                          onClick={handleSaveDeviceEdit}
                          className="text-[10.5px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded shadow-xs hover:bg-indigo-700 transition cursor-pointer"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingDevice(false)}
                          className="text-[10.5px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded hover:bg-slate-300 transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>

                  {!isEditingDevice ? (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">
                          Dispositivo:
                        </span>
                        <span className="font-semibold text-slate-700 text-sm">
                          {selectedOrderForModal.deviceType}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">
                          Marca/Modelo:
                        </span>
                        <span className="font-semibold text-slate-700 text-sm">
                          {selectedOrderForModal.brand}{" "}
                          {selectedOrderForModal.model}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">
                          S/N:
                        </span>
                        <span className="font-mono font-semibold text-slate-700 text-sm">
                          {selectedOrderForModal.serialNumber || "N/A"}
                        </span>
                      </div>

                      {/* Conditional Security details (Password and/or Pattern) */}
                      {(selectedOrderForModal.devicePassword ||
                        selectedOrderForModal.devicePattern) && (
                        <div className="col-span-3 border-t border-slate-200/50 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-100/50 p-2.5 rounded-lg border border-slate-200/40 mt-1">
                          {selectedOrderForModal.devicePassword && (
                            <div className="flex items-center space-x-2">
                              <Lock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">
                                  Contraseña:
                                </span>
                                <span className="font-mono font-semibold text-slate-800 text-xs">
                                  {selectedOrderForModal.devicePassword}
                                </span>
                              </div>
                            </div>
                          )}
                          {selectedOrderForModal.devicePattern && (
                            <div className="flex items-center space-x-2">
                              <div className="w-5 h-5 bg-indigo-50 border border-indigo-200 rounded flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-indigo-600">
                                  ⁙
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">
                                  Patrón (Puntos conectados):
                                </span>
                                <span className="font-mono font-semibold text-slate-850 text-xs bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100">
                                  {selectedOrderForModal.devicePattern}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="col-span-3 border-t border-slate-200/60 pt-2.5 mt-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <span className="text-slate-400 block text-[10px] mb-0.5">
                            Problema Reportado (Ingreso):
                          </span>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed p-2 whitespace-pre-wrap">
                            {selectedOrderForModal.reportedProblem ||
                              selectedOrderForModal.description}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] mb-0.5">
                            Trabajos a Realizar (Ingreso):
                          </span>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed p-2 whitespace-pre-wrap">
                            {selectedOrderForModal.plannedWork ||
                              "Sin registrar"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500 block">
                            Dispositivo
                          </label>
                          <CustomSelect
                            value={editDeviceType}
                            onChange={(val) => setEditDeviceType(val)}
                            className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded text-slate-800 font-semibold"
                            options={activeDeviceTypes.map((type) => ({
                              value: type,
                              label: type,
                            }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-900 block">
                            Marca *
                          </label>
                          <input
                            type="text"
                            value={editDeviceBrand}
                            onChange={(e) => setEditDeviceBrand(e.target.value)}
                            className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 text-slate-800 font-semibold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-900 block">
                            Modelo *
                          </label>
                          <input
                            type="text"
                            value={editDeviceModel}
                            onChange={(e) => setEditDeviceModel(e.target.value)}
                            className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 text-slate-800 font-semibold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500 block">
                            S/N Serial
                          </label>
                          <input
                            type="text"
                            value={editDeviceSerialNumber}
                            onChange={(e) =>
                              setEditDeviceSerialNumber(e.target.value)
                            }
                            className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 text-slate-800 font-mono"
                          />
                        </div>
                      </div>

                      {/* Security credentials in Edit mode */}
                      {(editDeviceType === "Notebook" ||
                        editDeviceType === "Celular" ||
                        editDeviceType === "Tablet" ||
                        editDeviceType === "CPU / PC Desktop") && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-100/60 p-3 rounded-lg border border-slate-200/50 mt-1">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-700 flex items-center space-x-1">
                              <Lock className="h-3 w-3 text-indigo-500 shrink-0" />
                              <span>Contraseña / PIN de Desbloqueo</span>
                            </label>
                            <input
                              type="text"
                              value={editDevicePassword}
                              onChange={(e) =>
                                setEditDevicePassword(e.target.value)
                              }
                              placeholder="Dejar vacío si no tiene"
                              className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 text-slate-800 font-medium"
                            />
                          </div>

                          {editDeviceType === "Celular" ||
                          editDeviceType === "Tablet" ? (
                            <div className="space-y-1">
                              <PatternLockInput
                                value={editDevicePattern}
                                onChange={(val) => setEditDevicePattern(val)}
                                title="Patrón de Desbloqueo"
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col justify-center text-slate-400 text-[10px] px-2.5 py-2 border border-dashed border-slate-200 bg-white rounded select-none leading-normal">
                              <span className="font-semibold text-slate-500">
                                Patrón de desbloqueo
                              </span>
                              <span>
                                Solo disponible para celulares y tablets.
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-900 block">
                            Problema Reportado (Ingreso) *
                          </label>
                          <textarea
                            rows={2}
                            value={editReportedProblem}
                            onChange={(e) => {
                              setEditReportedProblem(e.target.value);
                              e.target.style.height = "auto";
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            ref={(node) => {
                              if (node) {
                                node.style.height = "auto";
                                node.style.height = `${node.scrollHeight}px`;
                              }
                            }}
                            className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 text-slate-800 font-medium whitespace-pre-wrap overflow-hidden resize-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-900 block">
                            Trabajos a Realizar (Ingreso) *
                          </label>
                          <textarea
                            rows={2}
                            value={editPlannedWork}
                            onChange={(e) => {
                              setEditPlannedWork(e.target.value);
                              e.target.style.height = "auto";
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            ref={(node) => {
                              if (node) {
                                node.style.height = "auto";
                                node.style.height = `${node.scrollHeight}px`;
                              }
                            }}
                            className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 text-slate-800 font-medium whitespace-pre-wrap overflow-hidden resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Technician Assignment section */}
                {!isEditingDevice && renderTechnicianAssignment()}
              </div>

              {/* Column 2: Log & Tech Timeline */}
              <div className="flex-1 lg:flex-[1] min-w-0 p-5.5 border-b lg:border-b-0 lg:border-r border-slate-200 lg:overflow-y-auto space-y-5">
                {/* Technician Assignment section (moved here when editing device) */}
                {isEditingDevice && renderTechnicianAssignment()}

                {/* Technician Diagnostic Note Editor */}
                <div className="space-y-4 pt-1">
                  <div className="flex items-center space-x-1.5 border-b border-slate-100 pb-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Bitácora de Reparación y Diagnóstico (Técnico)
                    </h4>
                  </div>

                  <div className="space-y-3 font-sans">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">
                        Diagnóstico:
                      </label>
                      <textarea
                        rows={3}
                        value={diagnosticsTemp}
                        onChange={(e) => {
                          setDiagnosticsTemp(e.target.value);
                          e.target.style.height = "auto";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        ref={(node) => {
                          if (node) {
                            node.style.height = "auto";
                            node.style.height = `${node.scrollHeight}px`;
                          }
                        }}
                        placeholder="Diagnóstico del equipo: estado de componentes, fallas detectadas..."
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-800 overflow-hidden resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">
                        Trabajo Realizado:
                      </label>
                      <textarea
                        rows={3}
                        value={workPerformedTemp}
                        onChange={(e) => {
                          setWorkPerformedTemp(e.target.value);
                          e.target.style.height = "auto";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        ref={(node) => {
                          if (node) {
                            node.style.height = "auto";
                            node.style.height = `${node.scrollHeight}px`;
                          }
                        }}
                        placeholder="Trabajos realizados: limpieza, cambio de piezas, instalaciones..."
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-800 overflow-hidden resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">
                        Costo de Mano de Obra ($ ARS):
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="number"
                          value={laborCostTemp}
                          onChange={(e) =>
                            setLaborCostTemp(parseFloat(e.target.value) || 0)
                          }
                          className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Service Route Map / Timeline */}
                {(() => {
                  const getStatusTimestamp = (status: OrderStatus) => {
                    const entry = selectedOrderForModal.statusHistory?.find(
                      (h) => h.status === status,
                    );
                    return entry ? entry.timestamp : null;
                  };

                  const calculateElapsedTime = (
                    startStr: string,
                    endStr: string,
                  ): string => {
                    const start = new Date(startStr);
                    const end = new Date(endStr);
                    const diffMs = end.getTime() - start.getTime();
                    if (diffMs < 0) return "0m";

                    const diffMins = Math.floor(diffMs / 60000);
                    if (diffMins < 60) {
                      return `${diffMins} min`;
                    }

                    const diffHours = Math.floor(diffMins / 60);
                    const remainingMins = diffMins % 60;
                    if (diffHours < 24) {
                      return `${diffHours}h ${remainingMins}m`;
                    }

                    const diffDays = Math.floor(diffHours / 24);
                    const remainingHours = diffHours % 24;
                    return `${diffDays}d ${remainingHours}h`;
                  };

                  const tIngresado =
                    getStatusTimestamp("Ingresado") ||
                    selectedOrderForModal.createdAt;
                  const tEnReparacion = getStatusTimestamp("En Reparación");
                  const tListo = getStatusTimestamp("Listo");
                  const tEntregado = getStatusTimestamp("Entregado");

                  const steps = [
                    {
                      status: "Ingresado" as OrderStatus,
                      label: "Ingresado",
                      time: tIngresado,
                    },
                    {
                      status: "En Reparación" as OrderStatus,
                      label: "En Reparación",
                      time: tEnReparacion,
                    },
                    {
                      status: "Listo" as OrderStatus,
                      label: "Listo",
                      time: tListo,
                    },
                    {
                      status: "Entregado" as OrderStatus,
                      label: "Entregado",
                      time: tEntregado,
                    },
                  ];

                  const currentStatus = selectedOrderForModal.status;

                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-5 space-y-4 animate-fade-in shadow-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="h-4 w-4 text-indigo-600" />
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Ruta de Servicio y Tiempos
                          </h4>
                        </div>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold font-mono">
                          Total:{" "}
                          {calculateElapsedTime(
                            tIngresado,
                            tEntregado || new Date().toISOString(),
                          )}
                        </span>
                      </div>

                      {/* Stepper Grid */}
                      <div className="grid grid-cols-4 gap-1 text-center relative py-2 select-none">
                        {/* background track line */}
                        <div className="absolute top-6 left-[12.5%] right-[12.5%] h-0.5 bg-slate-200 -z-1" />
                        {/* colored active line */}
                        <div
                          className="absolute top-6 left-[12.5%] h-0.5 bg-indigo-600 transition-all duration-500 -z-1"
                          style={{
                            width: tEntregado
                              ? "75%"
                              : tListo
                                ? "50%"
                                : tEnReparacion
                                  ? "25%"
                                  : "0%",
                          }}
                        />

                        {steps.map((step, idx) => {
                          const isCompleted = step.time !== null;
                          const isActive = currentStatus === step.status;

                          return (
                            <div
                              key={idx}
                              className="flex flex-col items-center relative z-10"
                            >
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                                  isCompleted
                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                    : isActive
                                      ? "bg-indigo-50 border-indigo-600 text-indigo-600 ring-4 ring-indigo-100 animate-pulse"
                                      : "bg-white border-slate-300 text-slate-400"
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  idx + 1
                                )}
                              </div>
                              <span
                                className={`text-[10px] font-bold mt-2 truncate max-w-full ${isActive ? "text-indigo-600" : isCompleted ? "text-slate-800" : "text-slate-400"}`}
                              >
                                {step.label}
                              </span>
                              {step.time ? (
                                <span className="text-[8.5px] text-slate-500 font-semibold font-mono mt-0.5 leading-tight block">
                                  {new Date(step.time).toLocaleDateString(
                                    "es-AR",
                                    { day: "2-digit", month: "short" },
                                  )}
                                  <br />
                                  {new Date(step.time).toLocaleTimeString(
                                    "es-AR",
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </span>
                              ) : (
                                <span className="text-[8.5px] text-slate-300 italic mt-0.5 block">
                                  Pendiente
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Stage durations list */}
                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Duración de Fase
                        </div>

                        <div className="flex items-center justify-between py-0.5 leading-none">
                          <span className="text-slate-500 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-2" />
                            Ingresado → En Reparación:
                          </span>
                          {tEnReparacion ? (
                            <span className="font-bold text-slate-700 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                              {calculateElapsedTime(tIngresado, tEnReparacion)}
                            </span>
                          ) : currentStatus === "Ingresado" ? (
                            <span className="font-bold text-amber-600 font-mono bg-amber-50 px-1.5 py-0.5 rounded animate-pulse">
                              En curso (
                              {calculateElapsedTime(
                                tIngresado,
                                new Date().toISOString(),
                              )}
                              )
                            </span>
                          ) : (
                            <span className="text-slate-300 italic">N/A</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between py-0.5 leading-none">
                          <span className="text-slate-500 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2" />
                            En Reparación → Listo:
                          </span>
                          {tEnReparacion && tListo ? (
                            <span className="font-bold text-slate-700 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                              {calculateElapsedTime(tEnReparacion, tListo)}
                            </span>
                          ) : currentStatus === "En Reparación" ? (
                            <span className="font-bold text-amber-600 font-mono bg-amber-50 px-1.5 py-0.5 rounded animate-pulse">
                              En curso (
                              {calculateElapsedTime(
                                tEnReparacion,
                                new Date().toISOString(),
                              )}
                              )
                            </span>
                          ) : (
                            <span className="text-slate-300 italic">N/A</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between py-0.5 leading-none">
                          <span className="text-slate-500 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />
                            Listo → Entregado:
                          </span>
                          {tListo && tEntregado ? (
                            <span className="font-bold text-slate-700 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                              {calculateElapsedTime(tListo, tEntregado)}
                            </span>
                          ) : currentStatus === "Listo" ? (
                            <span className="font-bold text-amber-600 font-mono bg-amber-50 px-1.5 py-0.5 rounded animate-pulse">
                              En curso (
                              {calculateElapsedTime(
                                tListo,
                                new Date().toISOString(),
                              )}
                              )
                            </span>
                          ) : (
                            <span className="text-slate-300 italic">N/A</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Column 3: Spare Parts & Billing Details (Right Sidebar) */}
              <div className="w-full lg:w-80 xl:w-96 min-w-0 p-5.5 bg-slate-50 flex flex-col justify-between border-t lg:border-t-0 border-slate-200 shrink-0 lg:overflow-y-auto">
                <div className="space-y-5">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                    <div className="flex items-center space-x-1.5">
                      <Briefcase className="h-4.5 w-4.5 text-indigo-600" />
                      <h3 className="font-bold text-slate-900 text-sm">
                        Piezas y Repuestos
                      </h3>
                    </div>
                  </div>

                  {/* Search Spare Part in inventory to Assign */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-500">
                        Asignar Repuesto del Inventario:
                      </h4>
                      <button
                        onClick={() => setShowNewPartForm(!showNewPartForm)}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-0.5 cursor-pointer"
                      >
                        <span>
                          {showNewPartForm ? "Cancelar" : "+ Registrar nuevo"}
                        </span>
                      </button>
                    </div>

                    {showNewPartForm ? (
                      <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-xs space-y-2.5 animate-slide-down mb-4">
                        <h4 className="text-[11px] font-bold text-indigo-700 tracking-wider">
                          Nuevo Repuesto Rápido
                        </h4>

                        <div className="space-y-3 text-xs">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="col-span-2">
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                Nombre de la pieza *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="Ej. Pantalla OLED iPhone 13"
                                value={newPartName}
                                onChange={(e) => setNewPartName(e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-100 focus:bg-white"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                Tipo/Categoría *
                              </label>
                              {showNewCategoryInput ? (
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    placeholder="Nombre de categoría"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && newCategoryName.trim()) {
                                        addCategory(newCategoryName.trim(), 35);
                                        setNewPartCategory(newCategoryName.trim());
                                        handleCategoryChange(newCategoryName.trim());
                                        setNewCategoryName("");
                                        setShowNewCategoryInput(false);
                                      }
                                    }}
                                    autoFocus
                                    className="flex-1 p-2 bg-slate-50 border border-indigo-300 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:bg-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (newCategoryName.trim()) {
                                        addCategory(newCategoryName.trim(), 35);
                                        setNewPartCategory(newCategoryName.trim());
                                        handleCategoryChange(newCategoryName.trim());
                                        setNewCategoryName("");
                                        setShowNewCategoryInput(false);
                                      }
                                    }}
                                    className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                                  >✓</button>
                                  <button
                                    type="button"
                                    onClick={() => { setShowNewCategoryInput(false); setNewCategoryName(""); }}
                                    className="px-2 py-1 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-300"
                                  >✕</button>
                                </div>
                              ) : (
                                <div className="flex gap-1">
                                  <div className="relative flex-1">
                                    <select
                                      value={newPartCategory}
                                      onChange={(e) => handleCategoryChange(e.target.value)}
                                      className="w-full p-2 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-100 focus:bg-white cursor-pointer appearance-none"
                                    >
                                      {Object.keys(categoryMargins).map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                      ))}
                                    </select>
                                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setShowNewCategoryInput(true)}
                                    className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 shrink-0"
                                    title="Nueva categoría"
                                  >+</button>
                                </div>
                              )}
                            </div>
                            <div className="col-span-2">
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                SKU / Código
                              </label>
                              <input
                                type="text"
                                placeholder="REP-9921"
                                value={newPartSku}
                                onChange={(e) => setNewPartSku(e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-slate-100 focus:bg-white"
                              />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                Moneda de Cálculo
                              </label>
                              <div className="grid grid-cols-2 gap-1 h-[34px]">
                                <button
                                  type="button"
                                  onClick={() => setNewPartCurrency("ARS")}
                                  className={`w-full text-[10px] font-bold rounded-md border transition flex items-center justify-center ${
                                    newPartCurrency === "ARS"
                                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                  }`}
                                >
                                  Pesos ($)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNewPartCurrency("USD")}
                                  className={`w-full text-[10px] font-bold rounded-md border transition flex items-center justify-center ${
                                    newPartCurrency === "USD"
                                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                  }`}
                                >
                                  U$D
                                </button>
                              </div>
                            </div>
                            <div className="col-span-2">
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                Fijación de Ganancia
                              </label>
                              <div className="grid grid-cols-2 gap-1 h-[34px]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handlePricingTypeChange("margin")
                                  }
                                  className={`w-full px-1 text-[10px] font-bold rounded-md border transition flex items-center justify-center truncate ${
                                    newPartPricingType === "margin"
                                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                  }`}
                                >
                                  % Margen fijo
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handlePricingTypeChange("manual")
                                  }
                                  className={`w-full px-1 text-[10px] font-bold rounded-md border transition flex items-center justify-center ${
                                    newPartPricingType === "manual"
                                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                  }`}
                                >
                                  Manual
                                </button>
                              </div>
                            </div>

                            <div
                              className={`${newPartPricingType === "margin" ? "col-span-1" : "col-span-1 border-r border-slate-200/50 pr-2"}`}
                            >
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                Costo ({newPartCurrency === "USD" ? "U$D" : "$"}
                                ) *
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={newPartCostPrice || ""}
                                onChange={(e) =>
                                  handleCostPriceChange(
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                placeholder="0"
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black focus:outline-none focus:ring-2 focus:ring-slate-100"
                              />
                            </div>

                            {newPartPricingType === "margin" ? (
                              <div className="col-span-1">
                                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                  Ganancia (%)
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={newPartMarginPercent}
                                    onChange={(e) =>
                                      handleMarginPercentChange(
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    className="w-full p-2 pr-5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black focus:outline-none focus:ring-2 focus:ring-slate-100"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">
                                    %
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="col-span-1">
                                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                  Venta Final (
                                  {newPartCurrency === "USD" ? "U$D" : "$"}) *
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  required
                                  value={newPartFinalPrice || ""}
                                  onChange={(e) =>
                                    handleFinalPriceChange(
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  placeholder="0"
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-black focus:outline-none focus:ring-2 focus:ring-slate-100"
                                />
                              </div>
                            )}

                            {newPartPricingType === "margin" && (
                              <div className="col-span-2">
                                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                  Venta Final (
                                  {newPartCurrency === "USD" ? "U$D" : "$"})
                                </label>
                                <input
                                  type="number"
                                  disabled
                                  value={newPartFinalPrice || ""}
                                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-500 cursor-not-allowed"
                                />
                              </div>
                            )}

                            <div className="col-span-1">
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                Stock Inicial
                              </label>
                              <input
                                type="number"
                                min={1}
                                placeholder="10"
                                value={newPartStock}
                                onChange={(e) =>
                                  setNewPartStock(parseInt(e.target.value) || 0)
                                }
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-100"
                              />
                            </div>

                            <div className="col-span-2">
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                Modelos Correspondientes
                              </label>
                              <input
                                type="text"
                                placeholder="iPhone 13 / Pro"
                                value={newPartCompatible}
                                onChange={(e) =>
                                  setNewPartCompatible(e.target.value)
                                }
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-100"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (!newPartName || newPartFinalPrice <= 0) {
                                showToast(
                                  "Por favor complete los campos obligatorios (*)",
                                  "warning",
                                );
                                return;
                              }
                              addInventoryItem({
                                name: newPartName,
                                sku:
                                  newPartSku ||
                                  `SKU-${Date.now().toString().slice(-6)}`,
                                category: newPartCategory,
                                iva: newPartIva,
                                currency: newPartCurrency,
                                pricingType: newPartPricingType,
                                costPrice: newPartCostPrice,
                                marginPercent: newPartMarginPercent,
                                price: newPartFinalPrice,
                                finalPrice: newPartFinalPrice,
                                stock: newPartStock,
                                compatibleDevices: newPartCompatible,
                              });

                              setNewPartName("");
                              setNewPartSku("");
                              setNewPartCategory("Otro");
                              setNewPartCostPrice(0);
                              setNewPartMarginPercent(categoryMargins["Otro"] || 35);
                              setNewPartFinalPrice(0);
                              setNewPartStock(5);
                              setNewPartCompatible("");
                              setShowNewPartForm(false);
                              setPartFilterQuery("");
                              showToast(
                                "Nuevo repuesto guardado en el depósito comercial.",
                                "success",
                              );
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-lg transition"
                          >
                            Crear en Inventario
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5 relative" ref={dropdownRef}>
                        {/* Search & Combobox Input combined */}
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Escribe para buscar repuesto..."
                            value={partFilterQuery}
                            onFocus={() => setIsPartDropdownOpen(true)}
                            onChange={(e) => {
                              setPartFilterQuery(e.target.value);
                              setIsPartDropdownOpen(true);
                              if (selectedPartId) {
                                // If they type over the selected item, clear selection
                                setSelectedPartId("");
                              }
                            }}
                            className={`w-full pl-8 pr-10 py-2 text-xs bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400 text-slate-800 font-medium transition-colors ${
                              selectedPartId
                                ? "border-indigo-400 focus:ring-indigo-500 bg-indigo-50/10"
                                : "border-slate-200"
                            }`}
                          />
                          {selectedPartId || partFilterQuery ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPartId("");
                                setPartFilterQuery("");
                                setIsPartDropdownOpen(true);
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                              title="Limpiar búsqueda"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setIsPartDropdownOpen(!isPartDropdownOpen)
                              }
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Floating custom dropdown list */}
                        {isPartDropdownOpen && (
                          <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto bg-white border border-slate-300 rounded-lg shadow-xl py-1 text-xs">
                            {inventory.filter((item) => {
                              if (!partFilterQuery.trim()) return true;
                              const normalized = partFilterQuery.toLowerCase();
                              return (
                                item.name.toLowerCase().includes(normalized) ||
                                (item.sku &&
                                  item.sku
                                    .toLowerCase()
                                    .includes(normalized)) ||
                                (item.compatibleDevices &&
                                  item.compatibleDevices
                                    .toLowerCase()
                                    .includes(normalized))
                              );
                            }).length === 0 ? (
                              <div className="p-3 text-slate-400 italic text-center">
                                No se encontraron repuestos
                              </div>
                            ) : (
                              inventory
                                .filter((item) => {
                                  if (!partFilterQuery.trim()) return true;
                                  const normalized =
                                    partFilterQuery.toLowerCase();
                                  return (
                                    item.name
                                      .toLowerCase()
                                      .includes(normalized) ||
                                    (item.sku &&
                                      item.sku
                                        .toLowerCase()
                                        .includes(normalized)) ||
                                    (item.compatibleDevices &&
                                      item.compatibleDevices
                                        .toLowerCase()
                                        .includes(normalized))
                                  );
                                })
                                .map((item) => {
                                  const isOutOfStock = item.stock === 0;
                                  const isEditingStock = stockEditId === item.id;
                                  return (
                                    <div
                                      key={item.id}
                                      className={`w-full text-left px-3.5 py-2.5 border-b border-slate-100 last:border-b-0 flex flex-col transition ${
                                        selectedPartId === item.id
                                          ? "bg-indigo-50 text-indigo-900 font-semibold"
                                          : "hover:bg-slate-50 text-slate-700"
                                      } ${isOutOfStock && !isEditingStock ? "opacity-50" : ""}`}
                                    >
                                      <div
                                        className={`flex justify-between items-center w-full ${!isOutOfStock ? "cursor-pointer" : ""}`}
                                        onClick={() => {
                                          if (!isOutOfStock) {
                                            setSelectedPartId(item.id);
                                            setPartFilterQuery(item.name);
                                            setIsPartDropdownOpen(false);
                                            setStockEditId(null);
                                          }
                                        }}
                                      >
                                        <span className="font-bold truncate text-slate-900">
                                          {item.name}
                                        </span>
                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                                            isOutOfStock ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-700"
                                          }`}>
                                            Stock: {item.stock} u
                                          </span>
                                          <button
                                            type="button"
                                            title="Agregar stock"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (isEditingStock) {
                                                setStockEditId(null);
                                              } else {
                                                setStockEditId(item.id);
                                                setStockEditQty(1);
                                              }
                                            }}
                                            className="w-5 h-5 flex items-center justify-center rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-600 transition cursor-pointer"
                                          >
                                            <Plus className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                      {isEditingStock && (
                                        <div className="flex items-center gap-1.5 mt-2 bg-indigo-50 rounded-lg p-2" onClick={(e) => e.stopPropagation()}>
                                          <span className="text-[10px] font-bold text-indigo-700 whitespace-nowrap">Agregar:</span>
                                          <input
                                            type="number"
                                            min={1}
                                            value={stockEditQty}
                                            onChange={(e) => setStockEditQty(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-14 text-xs p-1 border border-indigo-200 bg-white rounded text-center font-bold"
                                            autoFocus
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                updateInventoryItem(item.id, { stock: item.stock + stockEditQty });
                                                setStockEditId(null);
                                                showToast(`+${stockEditQty} unidades agregadas a ${item.name}`, 'success');
                                              }
                                            }}
                                          />
                                          <span className="text-[10px] text-indigo-500">unidades</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              updateInventoryItem(item.id, { stock: item.stock + stockEditQty });
                                              setStockEditId(null);
                                              showToast(`+${stockEditQty} unidades agregadas a ${item.name}`, 'success');
                                            }}
                                            className="px-2 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 transition cursor-pointer whitespace-nowrap"
                                          >
                                            Confirmar
                                          </button>
                                        </div>
                                      )}
                                      <div
                                        className={`flex justify-between items-center w-full mt-1 text-[10.5px] text-slate-500 ${!isOutOfStock ? "cursor-pointer" : ""}`}
                                        onClick={() => {
                                          if (!isOutOfStock) {
                                            setSelectedPartId(item.id);
                                            setPartFilterQuery(item.name);
                                            setIsPartDropdownOpen(false);
                                            setStockEditId(null);
                                          }
                                        }}
                                      >
                                        <span className="truncate">
                                          Comp:{" "}
                                          {item.compatibleDevices ||
                                            "Cualquiera"}
                                        </span>
                                        <span className="shrink-0 font-bold text-slate-800">
                                          {item.price.toLocaleString("es-AR", {
                                            style: "currency",
                                            currency: "ARS",
                                            minimumFractionDigits: 0,
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        )}

                        {selectedPartId && (
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="number"
                              min={1}
                              max={
                                inventory.find((i) => i.id === selectedPartId)
                                  ?.stock || 1
                              }
                              value={partQuantity}
                              onChange={(e) =>
                                setPartQuantity(
                                  Math.max(1, parseInt(e.target.value) || 1),
                                )
                              }
                              className="w-16 text-xs p-2 border border-slate-200 bg-white rounded-lg text-center font-bold"
                              title="Cantidad"
                            />
                            <button
                              onClick={handleAddPart}
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center space-x-1 transition cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Asignar</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Assigned Parts List */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Repuestos Vinculados
                    </h4>

                    {selectedOrderForModal.partsUsed.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-2">
                        No se han cargado repuestos a esta orden de trabajo
                        todavía.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {selectedOrderForModal.partsUsed.map((part) => (
                          <div
                            key={part.id}
                            className="bg-white border border-slate-200 p-2.5 rounded-lg flex items-center justify-between text-xs hover:border-slate-300"
                          >
                            <div>
                              <p className="font-semibold text-slate-800 text-[11px] leading-tight">
                                {part.name}
                              </p>
                              <span className="text-slate-400 font-medium text-[10px] block mt-0.5">
                                {part.quantity} u. x{" "}
                                {part.price.toLocaleString("es-AR", {
                                  style: "currency",
                                  currency: "ARS",
                                  minimumFractionDigits: 0,
                                })}
                              </span>
                            </div>
                            <button
                              onClick={() => handleRemovePart(part.id)}
                              className="text-rose-500 hover:bg-rose-50 p-1.5 rounded transition shrink-0"
                              title="Quitar repuesto"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Total Card Block */}
                <div className="mt-6 pt-4 border-t border-slate-200 space-y-4">
                  <div className="space-y-1.5 text-xs text-slate-600 bg-white/70 p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between">
                      <span>Mano de obra:</span>
                      <span className="font-bold">
                        {laborCostTemp.toLocaleString("es-AR", {
                          style: "currency",
                          currency: "ARS",
                          minimumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Costo Repuestos:</span>
                      <span className="font-bold">
                        {selectedOrderForModal.partsUsed
                          .reduce((sum, p) => sum + p.price * p.quantity, 0)
                          .toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                            minimumFractionDigits: 0,
                          })}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-1.5 text-sm text-slate-900 font-bold">
                      <span>Total Estimado:</span>
                      <span className="text-indigo-600 font-black">
                        {(Number(laborCostTemp) + selectedOrderForModal.partsUsed.reduce((sum, p) => sum + p.price * p.quantity, 0)).toLocaleString(
                          "es-AR",
                          {
                            style: "currency",
                            currency: "ARS",
                            minimumFractionDigits: 0,
                          },
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Payment Status Section */}
                  <div className="mt-4 p-3 rounded-xl border border-slate-200 bg-white/70 space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Estado de Pago
                    </label>
                    <div className="flex space-x-1.5">
                      {(["Pendiente", "Parcial", "Pagado"] as const).map((ps) => {
                        const isActive = paymentStatusTemp === ps;
                        const colors = ps === "Pagado"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : ps === "Parcial"
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-rose-500 text-white border-rose-500";
                        const inactiveColors = ps === "Pagado"
                          ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          : ps === "Parcial"
                          ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                          : "border-rose-200 text-rose-700 hover:bg-rose-50";
                        return (
                          <button
                            key={ps}
                            type="button"
                            onClick={() => {
                              setPaymentStatusTemp(ps);
                              if (ps === "Pagado") {
                                const total = Number(laborCostTemp) + selectedOrderForModal.partsUsed.reduce((s, p) => s + p.price * p.quantity, 0);
                                setAmountPaidTemp(total);
                              } else if (ps === "Pendiente") {
                                setAmountPaidTemp(0);
                              }
                            }}
                            className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg border transition cursor-pointer ${isActive ? colors : inactiveColors}`}
                          >
                            {ps}
                          </button>
                        );
                      })}
                    </div>
                    {paymentStatusTemp === "Parcial" && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500">Monto Abonado ($)</label>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500" />
                          <input
                            type="number"
                            min={0}
                            value={amountPaidTemp || ""}
                            onChange={(e) => setAmountPaidTemp(parseFloat(e.target.value) || 0)}
                            className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 outline-none"
                            placeholder="0"
                          />
                        </div>
                        {(() => {
                          const total = Number(laborCostTemp) + selectedOrderForModal.partsUsed.reduce((s, p) => s + p.price * p.quantity, 0);
                          const remaining = total - amountPaidTemp;
                          return remaining > 0 ? (
                            <p className="text-[10px] text-amber-600 font-semibold">
                              Resta: {remaining.toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 })}
                            </p>
                          ) : null;
                        })()}
                      </div>
                    )}
                    {paymentStatusTemp === "Pagado" && (
                      <p className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Servicio saldado completamente</span>
                      </p>
                    )}
                  </div>

                  {/* Primary Actions */}
                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Estado de la Orden
                      </label>
                      <CustomSelect
                        value={selectedOrderForModal.status}
                        onChange={(val) => {
                          const newStatus = val as OrderStatus;
                          updateOrderStatus(
                            selectedOrderForModal.id,
                            newStatus,
                          );
                          setSelectedOrderForModal((prev) =>
                            prev ? { ...prev, status: newStatus } : null,
                          );
                        }}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700"
                        options={statuses.map((st) => ({
                          value: st,
                          label: st,
                        }))}
                      />
                    </div>

                    <button
                      onClick={handleApplyTechnicalEdit}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] py-2 px-3 rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Save className="h-4 w-4" />
                      <span>Guardar Nota de Trabajo</span>
                    </button>

                    {showDeleteTicketConfirm ? (
                      <div className="space-y-1.5 p-2 bg-rose-50 border border-rose-100 rounded-lg animate-fade-in text-center">
                        <p className="text-[10px] text-rose-700 font-bold leading-tight">
                          ¿Desea eliminar permanentemente este ticket?
                        </p>
                        <div className="flex space-x-1 justify-center mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              deleteOrder(selectedOrderForModal.id);
                              closeOrderDetails();
                            }}
                            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] py-1 px-2 rounded-md transition cursor-pointer"
                          >
                            Sí, borrar
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDeleteTicketConfirm(false)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] py-1 px-2 rounded-md transition cursor-pointer"
                          >
                            No, cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowDeleteTicketConfirm(true)}
                        className="w-full hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-[11px] py-1.5 px-3 rounded-lg transition flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Eliminar Ticket</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nuevo Service Floating Modal overlay */}
      {isNewServiceModalOpen && (
        <div
          id="new-service-floating-modal"
          className="fixed inset-0 z-50 p-4 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center overflow-y-auto animate-fade-in"
        >
          <div
            className={`w-full max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-100 p-6.5 relative animate-scale-up overflow-y-auto transition-all duration-300 ${
              isClientModalSubOpen ? "max-w-2xl" : "max-w-4xl"
            }`}
          >
            {/* Absolute close icon top-right */}
            <button
              type="button"
              onClick={() => {
                setIsNewServiceModalOpen(false);
                setIsClientModalSubOpen(false);
              }}
              className={`absolute top-5 right-5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-all cursor-pointer z-10 ${
                isClientModalSubOpen ? "hidden" : ""
              }`}
            >
              <X className="h-5 w-5" />
            </button>

            <OrderForm
              setActiveTab={setActiveTab}
              onClose={() => {
                setIsNewServiceModalOpen(false);
                setIsClientModalSubOpen(false);
              }}
              onClientModalToggle={(isOpen) => setIsClientModalSubOpen(isOpen)}
            />
          </div>
        </div>
      )}

      {/* Printable high-fidelity receipt portal */}
      {selectedOrderForModal && typeof window !== "undefined" && createPortal(
        <div id="print-portal-root">
          <div
            id="printable-receipt-card"
            className="p-5 text-black bg-white max-w-3xl mx-auto space-y-4 font-sans text-xs border border-transparent leading-tight print:p-2 print:space-y-2.5"
          >
            {/* Header info */}
            <div className="flex justify-between items-start border-b border-slate-300 pb-3">
              <div className={`flex ${logoPosition === 'top' ? 'flex-col items-start space-y-1.5' : 'flex-row items-center space-x-3'}`}>
                {workshopLogo && (
                  <img
                    src={workshopLogo}
                    alt="Logo"
                    className={`${logoPosition === 'top' ? 'max-h-12 w-auto max-w-[160px] mr-2 mb-1.5' : 'w-12 h-12'} object-contain shrink-0 rounded`}
                    referrerPolicy="no-referrer"
                  />
                )}
                <div>
                  {!workshopLogo && (
                    <h1 className="text-base font-extrabold tracking-tight uppercase text-slate-900 font-display">
                      {workshopName}
                    </h1>
                  )}
                  <p className="text-slate-500 font-medium text-[9px] mt-0.5 leading-none">
                    {ticketSub}
                  </p>
                  <p className="text-[8px] text-slate-400 mt-1 flex items-center leading-none">
                    Fecha Emisión: {new Date(selectedOrderForModal.createdAt).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })} hs
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-slate-100 border border-slate-300 rounded px-3 py-1.5 inline-block">
                  <span className="text-[8px] block text-slate-500 uppercase font-bold tracking-wider leading-none">
                    {ticketTitle}
                  </span>
                  <span className="text-base font-bold font-mono text-slate-900 block mt-0.5 leading-none">
                    {selectedOrderForModal.id}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-[8px] font-bold text-slate-500 block">
                    Prioridad: <span className="text-slate-900 text-[9px] uppercase font-bold">{selectedOrderForModal.priority}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Split Client and Equipment */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              {/* Cliente */}
              <div className="space-y-1.5 border border-slate-200 rounded-lg p-2.5">
                <h3 className="font-bold text-slate-900 uppercase tracking-wide border-b border-slate-105 pb-0.5 text-[9px]">
                  Datos del Cliente
                </h3>
                <div className="space-y-1">
                  <p className="text-slate-750 text-[11px]">
                    <span className="text-slate-400 font-medium">Nombre:</span>{" "}
                    <strong className="text-slate-900">{selectedOrderForModal.clientName}</strong>
                  </p>
                  <p className="text-slate-755 text-[11px]">
                    <span className="text-slate-400 font-medium">Teléfono:</span>{" "}
                    <strong className="text-slate-850">{selectedOrderForModal.clientPhone || "No especificado"}</strong>
                  </p>
                  <p className="text-slate-760 text-[11px]">
                    <span className="text-slate-400 font-medium">Ubicación:</span>{" "}
                    <span className="text-slate-800">
                      {selectedOrderForModal.localidad || selectedOrderForModal.provincia
                        ? `${selectedOrderForModal.localidad || ''}, ${selectedOrderForModal.provincia || ''}`.trim().replace(/^,|,$/g, '')
                        : "No cargada"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Equipo specs */}
              <div className="space-y-1.5 border border-slate-200 rounded-lg p-2.5">
                <h3 className="font-bold text-slate-900 uppercase tracking-wide border-b border-slate-110 pb-0.5 text-[9px]">
                  Ficha del Equipo
                </h3>
                <div className="space-y-1">
                  <p className="text-slate-765 text-[11px]">
                    <span className="text-slate-400 font-medium">Categoría:</span>{" "}
                    <strong className="text-slate-900">{selectedOrderForModal.deviceType}</strong>
                  </p>
                  <p className="text-slate-770 text-[11px]">
                    <span className="text-slate-400 font-medium">Marca/Modelo:</span>{" "}
                    <strong className="text-slate-900">
                      {selectedOrderForModal.brand} {selectedOrderForModal.model}
                    </strong>
                  </p>
                  <p className="text-slate-775 text-[11px]">
                    <span className="text-slate-400 font-medium">Nro. Serie:</span>{" "}
                    <span className="font-mono text-slate-900 bg-slate-50 px-1 border rounded">{selectedOrderForModal.serialNumber || "N/A"}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Credenciales de Acceso / Seguridad */}
            {(selectedOrderForModal.devicePassword || selectedOrderForModal.devicePattern) && (
              <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50">
                <h3 className="font-bold text-slate-900 uppercase tracking-wide border-b border-slate-115 pb-0.5 text-[9px] mb-1.5">
                  Seguridad y Desbloqueo de Dispositivo
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {selectedOrderForModal.devicePassword && (
                    <p className="text-slate-780 text-[11px]">
                      <span className="text-slate-400 font-medium">PIN / Contraseña:</span>{" "}
                      <code className="text-xs bg-slate-100 px-1.5 py-0.5 border rounded text-slate-800 font-mono font-bold">
                        {selectedOrderForModal.devicePassword}
                      </code>
                    </p>
                  )}
                  {selectedOrderForModal.devicePattern && (
                    <div>
                      <p className="text-slate-785 text-[11px]">
                        <span className="text-slate-400 font-medium">Patrón registrado:</span>{" "}
                        <span className="font-mono text-slate-900 text-[10px] block mt-0.5 break-all bg-slate-100 px-1.5 py-0.5 border rounded">
                          {selectedOrderForModal.devicePattern}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Enunciado del Problema & Trabajo Planificado */}
            <div className="space-y-2.5 pt-1">
              <div className="space-y-0.5">
                <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                  SÍNTOMAS / DETALLE REPORTADO:
                </h4>
                <p className="text-slate-800 bg-slate-55 border border-slate-200 rounded-md py-1.5 px-2.5 font-sans whitespace-pre-line text-xs leading-normal">
                  {selectedOrderForModal.reportedProblem || selectedOrderForModal.description}
                </p>
              </div>

              {selectedOrderForModal.plannedWork && (
                <div className="space-y-0.5">
                  <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                    TRABAJO PLANIFICADO:
                  </h4>
                  <p className="text-slate-805 bg-slate-55 border border-slate-200 rounded-md py-1.5 px-2.5 font-sans whitespace-pre-line text-xs leading-normal">
                    {selectedOrderForModal.plannedWork}
                  </p>
                </div>
              )}

              {selectedOrderForModal.diagnosticNotes && (
                <div className="space-y-0.5">
                  <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                    DIAGNÓSTICO:
                  </h4>
                  <p className="text-slate-810 bg-slate-55 border border-slate-200 rounded-md py-1.5 px-2.5 font-sans whitespace-pre-line text-xs leading-normal">
                    {selectedOrderForModal.diagnosticNotes}
                  </p>
                </div>
              )}

              {selectedOrderForModal.workPerformed && (
                <div className="space-y-0.5">
                  <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                    TRABAJO REALIZADO:
                  </h4>
                  <p className="text-slate-810 bg-slate-55 border border-slate-200 rounded-md py-1.5 px-2.5 font-sans whitespace-pre-line text-xs leading-normal">
                    {selectedOrderForModal.workPerformed}
                  </p>
                </div>
              )}
            </div>

            {/* Presupuesto Detallado (Costos parciales / total) */}
            <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 animate-none">
                    <th className="py-1 px-2.5 text-slate-600 font-bold text-[10px]">Concepto / Repuesto</th>
                    <th className="py-1 px-2.5 text-slate-600 font-bold text-center w-16 text-[10px]">Cantidad</th>
                    <th className="py-1 px-2.5 text-slate-600 font-bold text-right w-24 text-[10px]">Precio Unit.</th>
                    <th className="py-1 px-2.5 text-slate-600 font-bold text-right w-24 text-[10px]">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* Mano de Obra row */}
                  <tr>
                    <td className="py-1 px-2.5 text-slate-700 text-[10.5px]">Mano de Obra (Labor Técnica / Laboratorio)</td>
                    <td className="py-1 px-2.5 text-center text-slate-600 text-[10.5px]">1</td>
                    <td className="py-1 px-2.5 text-right text-slate-700 text-[10.5px]">${(selectedOrderForModal.laborCost || 0).toLocaleString('es-AR')}</td>
                    <td className="py-1 px-2.5 text-right text-slate-900 font-bold text-[10.5px]">${(selectedOrderForModal.laborCost || 0).toLocaleString('es-AR')}</td>
                  </tr>

                  {/* Spare parts rows */}
                  {selectedOrderForModal.partsUsed && selectedOrderForModal.partsUsed.length > 0 ? (
                    selectedOrderForModal.partsUsed.map((part) => (
                      <tr key={part.id}>
                        <td className="py-1 px-2.5 text-slate-700 text-[10.5px]">Repuesto: {part.name}</td>
                        <td className="py-1 px-2.5 text-center text-slate-600 text-[10.5px]">{part.quantity}</td>
                        <td className="py-1 px-2.5 text-right text-slate-700 text-[10.5px]">${part.price.toLocaleString('es-AR')}</td>
                        <td className="py-1 px-2.5 text-right text-slate-900 font-bold font-mono text-[10.5px]">
                          ${(part.price * part.quantity).toLocaleString('es-AR')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-1 px-2.5 text-[9px] text-slate-400 text-center italic">
                        No se han vinculado insumos o repuestos adicionales a este ticket hasta el momento.
                      </td>
                    </tr>
                  )}

                  {/* Total general row */}
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td colSpan={3} className="py-1.5 px-2.5 text-right uppercase text-slate-600 font-bold text-[9px] tracking-wider">
                      Presupuesto Estimado Total:
                    </td>
                    <td className="py-1.5 px-2.5 text-right text-[13px] text-indigo-700 font-extrabold font-mono">
                      ${(selectedOrderForModal.totalCost || 0).toLocaleString('es-AR')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Términos y Condiciones Letra Chica */}
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
              <strong className="text-[9px] text-slate-600 block uppercase tracking-wide font-bold">
                Condiciones de Almacenamiento y Recepción:
              </strong>
              <div className="whitespace-pre-line text-[7.5px] text-slate-500 leading-normal">
                {ticketTerms}
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-6 pt-4 text-center text-slate-600 text-[9px]">
              <div className="space-y-4">
                <div className="border-b border-slate-300 mx-auto w-40"></div>
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[8px] leading-none">Firma del Cliente / Aclaración</p>
                <p className="text-[8px] text-slate-400 leading-none">He leído y acepto las condiciones descritas.</p>
              </div>
              <div className="space-y-4">
                <p className="border-b border-slate-300 mx-auto w-40"></p>
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[8px] leading-none">Firma del Operador de Laboratorio</p>
                <span className="text-[8px] text-slate-400 font-mono leading-none">Técnico: {selectedOrderForModal.assignedTechnician || "Guardia Central"}</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* WhatsApp Custom Notification Assistant Pop-up */}
      {isShareModalOpen && selectedOrderForModal && (
        <div className="fixed inset-0 z-[100] p-4 bg-slate-900/70 backdrop-blur-xs flex justify-center items-center overflow-y-auto animate-fade-in">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 relative animate-scale-up overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-emerald-500 animate-pulse" />
                <h3 className="text-base font-bold text-slate-800">
                  {isEditingTemplatesMode
                    ? "Configurar Plantillas Predeterminadas"
                    : "Asistente de Notificación WhatsApp"}
                </h3>
              </div>
              <div className="flex items-center space-x-1.5">
                {/* Toggle configuration mode */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isEditingTemplatesMode) {
                      setEditingTemplateType(shareTemplateType);
                      setEditTemplateText(whatsappTemplates[shareTemplateType]);
                    } else {
                      // Exiting edit mode, refresh preview custom text
                      setShareCustomText(getWhatsAppMessage(selectedOrderForModal, shareTemplateType));
                    }
                    setIsEditingTemplatesMode(!isEditingTemplatesMode);
                    setShowSaveSuccess(false);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-black rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer border border-slate-200"
                >
                  {isEditingTemplatesMode ? (
                    <span>← Volver al Asistente</span>
                  ) : (
                    <span>Configurar Plantillas ⚙️</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsShareModalOpen(false);
                    setIsEditingTemplatesMode(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {isEditingTemplatesMode ? (
              /* Editable Template Configuration Assistant */
              <div className="flex flex-col flex-1 min-h-0">
                {/* Template picker */}
                <div className="mt-4">
                  <label className="text-[10.5px] font-bold text-slate-500 block mb-2 uppercase tracking-wide">
                    Seleccionar Plantilla para Editar:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-105 rounded-lg text-center text-xs">
                    {(["ingreso", "diagnostico", "listo", "entregado"] as const).map((type) => {
                      const labelMap = {
                        ingreso: "1. Ingreso",
                        diagnostico: "2. Presupuesto",
                        listo: "3. Listo",
                        entregado: "4. Entregado",
                      };
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setEditingTemplateType(type);
                            setEditTemplateText(whatsappTemplates[type]);
                            setShowSaveSuccess(false);
                          }}
                          className={`py-1.5 px-2 rounded-md font-bold transition text-[10.5px] cursor-pointer ${
                            editingTemplateType === type
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-855 hover:bg-slate-50"
                          }`}
                        >
                          {labelMap[type]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Matrix Editing TextArea */}
                <div className="mt-4 flex flex-col space-y-1.5 flex-1">
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="font-bold text-slate-500 uppercase tracking-wide">
                      Texto Matriz de la Plantilla:
                    </span>
                    <span className="text-slate-400 italic">No elimines las llaves de las variables</span>
                  </div>
                  <textarea
                    rows={6}
                    value={editTemplateText}
                    onChange={(e) => setEditTemplateText(e.target.value)}
                    className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                    placeholder="Diseña la matriz de mensajes con etiquetas dinámicas..."
                  />
                </div>

                {/* Compatible variables legend */}
                <div className="mt-3.5 p-3 px-3.5 bg-emerald-50/50 border border-emerald-100/60 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-emerald-800 block uppercase tracking-wider">
                    Variables inteligentes disponibles (Haz clic para anexar):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { tag: "{cliente}", desc: "Cliente" },
                      { tag: "{ticket}", desc: "Ticket" },
                      { tag: "{dispositivo}", desc: "Categoría" },
                      { tag: "{marca_modelo}", desc: "Modelo" },
                      { tag: "{presupuesto}", desc: "Presupuesto" },
                      { tag: "{mano_obra}", desc: "Mano Obra" },
                      { tag: "{info_mano_obra}", desc: "Detalle Mano Obra" },
                      { tag: "{info_repuestos}", desc: "Repuestos" },
                      { tag: "{notas}", desc: "Diagnóstico" },
                      { tag: "{trabajo_realizado}", desc: "Trabajo Realizado" },
                      { tag: "{tecnico}", desc: "Técnico" },
                      { tag: "{trabajos_realizados}", desc: "Diagnóstico + Trabajo" },
                      { tag: "{info_mano_obra_listo}", desc: "Mano Obra (Listo)" },
                      { tag: "{info_repuestos_listo}", desc: "Repuestos con precios" },
                    ].map((item) => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => setEditTemplateText((prev) => prev + item.tag)}
                        className="px-2 py-0.5 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 rounded font-mono text-[9.5px] text-slate-700 transition cursor-pointer shadow-2xs"
                        title={item.desc}
                      >
                        {item.tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save and restore buttons */}
                <div className="mt-4 flex space-x-3 items-center">
                  <button
                    type="button"
                    onClick={() => {
                      const fallbackTemplatesMap = {
                        ingreso: `Estimado/a *{cliente}*,\n\nLe informamos que su *{dispositivo} {marca_modelo}* ha sido ingresado correctamente en nuestro servicio técnico con el Ticket *#{ticket}*.\n\n*Problema reportado:* {problema}\n*Técnico asignado:* {tecnico}\n\nPuede consultar el avance de su reparación en cualquier momento citando este nro de ticket.\n\n¡Muchas gracias por su confianza!`,
                        diagnostico: `Estimado/a *{cliente}*,\n\nLe enviamos el diagnóstico para su Ticket *#{ticket}* (*{dispositivo} {marca_modelo}*):\n\n*Presupuesto total:* {presupuesto} {info_mano_obra}{info_repuestos}\n\n*Notas de diagnóstico:* {notas}\n\nPor favor, respóndanos a este mensaje para confirmar si aprueba la reparación y podemos comenzar el trabajo.\n\nQuedamos a su disposición.`,
                        listo: `Estimado/a *{cliente}*,\n\n¡Le tenemos excelentes noticias! Su equipo *{dispositivo} {marca_modelo}* (Ticket *#{ticket}*) ha sido reparado con éxito y ya está *LISTO PARA RETIRAR* en nuestro local.{trabajos_realizados}{info_mano_obra_listo}{info_repuestos_listo}\n\n*Costo total final:* {presupuesto}\n\nPuede pasar de lunes a viernes en nuestro horario de atención comercial.\n\n¡Lo/a esperamos!`,
                        entregado: `Estimado/a *{cliente}*,\n\nRegistramos que su equipo *{dispositivo} {marca_modelo}* (Ticket *#{ticket}*) ha sido entregado exitosamente.\n\n¡Agradecemos mucho haber elegido nuestro servicio de reparación! Si tiene alguna consulta o necesita asistencia adicional, quedamos a su entera disposición.`
                      };
                      setEditTemplateText(fallbackTemplatesMap[editingTemplateType]);
                      setShowSaveSuccess(false);
                    }}
                    className="py-1.5 px-3 border border-slate-205 hover:bg-slate-50 text-slate-600 hover:text-black rounded-lg text-[11px] font-bold transition cursor-pointer"
                  >
                    Restaurar Predeterminado
                  </button>

                  <div className="flex-1"></div>

                  {showSaveSuccess && (
                    <span className="text-emerald-600 font-bold text-xs flex items-center space-x-1 animate-fade-in mr-1">
                      <Check className="h-4 w-4" />
                      <span>¡Guardado con éxito!</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...whatsappTemplates,
                        [editingTemplateType]: editTemplateText
                      };
                      setWhatsappTemplates(updated);
                      localStorage.setItem("crm_whatsapp_templates", JSON.stringify(updated));
                      setShowSaveSuccess(true);
                      setTimeout(() => setShowSaveSuccess(false), 2000);
                    }}
                    className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-550 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Guardar Plantilla
                  </button>
                </div>
              </div>
            ) : (
              /* Active Message Preview / Sender Dialog */
              <div className="flex flex-col flex-1 min-h-0">
                {/* Info bar */}
                <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-800">
                  <div>
                    <p className="font-bold">Cliente: <span className="text-slate-900 font-extrabold">{selectedOrderForModal.clientName}</span></p>
                    <p className="text-[10px] text-emerald-600 font-mono mt-0.5">Destinatario: {selectedOrderForModal.clientPhone || "No ingresada"}</p>
                  </div>
                  <span className="bg-emerald-500 text-white font-extrabold px-2.5 py-1 rounded text-[10px] font-mono shadow-xs">
                    {selectedOrderForModal.id}
                  </span>
                </div>

                {/* Template Selector Tabs */}
                <div className="mt-4">
                  <label className="text-[10.5px] font-bold text-slate-500 block mb-2 uppercase tracking-wide">
                    Seleccionar Plantilla de Mensaje:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-lg text-center text-xs">
                    {(["ingreso", "diagnostico", "listo", "entregado"] as const).map((type) => {
                      const labelMap = {
                        ingreso: "1. Ingreso",
                        diagnostico: "2. Presupuesto",
                        listo: "3. Listo",
                        entregado: "4. Entregado",
                      };
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setShareTemplateType(type);
                            setShareCustomText(getWhatsAppMessage(selectedOrderForModal, type));
                            setCopiedShareText(false);
                          }}
                          className={`py-1.5 px-2 rounded-md font-bold transition text-[10.5px] cursor-pointer ${
                            shareTemplateType === type
                              ? "bg-white text-slate-850 shadow-xs"
                              : "text-slate-500 hover:text-slate-850"
                          }`}
                        >
                          {labelMap[type]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Editable Draft */}
                <div className="mt-4 space-y-1.5 flex flex-col flex-1 min-h-0">
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="font-bold text-slate-500 uppercase tracking-wide">
                      Mensaje a enviar (Modificable):
                    </span>
                    <span className="text-slate-400 italic">Mensaje enriquecido con negritas de WhatsApp</span>
                  </div>
                  <textarea
                    rows={6}
                    value={shareCustomText}
                    onChange={(e) => setShareCustomText(e.target.value)}
                    className="w-full text-xs font-sans p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed flex-1"
                    placeholder="Escribe el mensaje personalizado..."
                  />
                </div>

                {/* Actions */}
                <div className="mt-5 grid grid-cols-2 gap-3 pb-1">
                  {/* Copy Message */}
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(shareCustomText);
                      setCopiedShareText(true);
                      setTimeout(() => setCopiedShareText(false), 2000);
                    }}
                    className={`py-2.5 px-4 rounded-xl font-bold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                      copiedShareText
                        ? "bg-slate-800 text-emerald-400 border border-transparent"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-800 border border-slate-200"
                    }`}
                  >
                    {copiedShareText ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400 animate-fade-in" />
                        <span>¡Copiado con éxito!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4 text-slate-500" />
                        <span>Copiar Mensaje</span>
                      </>
                    )}
                  </button>

                  {/* Send WhatsApp */}
                  <button
                    type="button"
                    onClick={() => {
                      const numericPhone = (selectedOrderForModal.clientPhone || "").replace(/\D/g, "");
                      let preparedPhone = numericPhone;
                      if (numericPhone.length > 0 && !numericPhone.startsWith("54") && numericPhone.length <= 11) {
                        preparedPhone = `549${numericPhone}`;
                      }
                      const waUrl = `https://wa.me/${preparedPhone}?text=${encodeURIComponent(shareCustomText)}`;
                      window.open(waUrl, "_blank");
                    }}
                    className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Enviar por WhatsApp</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
