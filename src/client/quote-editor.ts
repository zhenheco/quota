import { computeTotals } from '../shared/calc';
import {
  formatMoney,
  formatQuantity,
  renderQuoteItemRows,
} from '../shared/quote-document-template';

interface PreviewItem {
  name: string;
  description: string;
  qty: number;
  unit: string;
  unit_price: number;
}

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const editor = document.querySelector<HTMLElement>('[data-quote-editor]');

function field(name: string): FieldElement | null {
  return editor?.querySelector(`[name="${name}"]`) as FieldElement | null;
}

function preview(name: string): HTMLElement | null {
  return editor?.querySelector<HTMLElement>(`[data-preview="${name}"]`) ?? null;
}

function setPreview(name: string, value: string): void {
  const element = preview(name);

  if (element) {
    element.textContent = value;
  }
}

function setOptionalPreview(name: string, value: string): void {
  setPreview(name, value);

  const row = editor?.querySelector<HTMLElement>(`[data-preview-optional="${name}"]`) ?? null;

  if (row) {
    row.hidden = value.trim() === '';
  }
}

function setTaxRowVisibility(showTaxRows: boolean): void {
  const rows = editor?.querySelectorAll<HTMLElement>(
    '[data-preview-subtotal-row], [data-preview-tax-row]'
  );

  rows?.forEach((row) => {
    row.hidden = !showTaxRows;
  });
}

function itemRows(): HTMLElement[] {
  return Array.from(editor?.querySelectorAll<HTMLElement>('.item-row') ?? []);
}

function readItems(): PreviewItem[] {
  return itemRows()
    .map((row) => {
      const input = (name: string) => row.querySelector<HTMLInputElement>(`[name="${name}"]`);
      const qty = Number(input('item_qty')?.value ?? 0);
      const unitPrice = Number(input('item_unit_price')?.value ?? 0);

      return {
        name: input('item_name')?.value ?? '',
        description: input('item_description')?.value ?? '',
        qty: Number.isFinite(qty) ? qty : 0,
        unit: input('item_unit')?.value ?? '',
        unit_price: Number.isFinite(unitPrice) ? unitPrice : 0,
      };
    })
    .filter((item) => item.name.trim() !== '');
}

function renderItems(items: PreviewItem[]): void {
  const body = preview('items');

  if (!body) {
    return;
  }

  body.innerHTML = renderQuoteItemRows(
    items.map((item) => ({
      name: item.name,
      description: item.description,
      qtyLabel: formatQuantity(item.qty),
      unit: item.unit,
      unitPriceLabel: formatMoney(item.unit_price),
      amountLabel: formatMoney(Math.round(item.qty * item.unit_price)),
    }))
  );
}

function syncClientFromSelect(): void {
  const select = field('client_id') as HTMLSelectElement | null;
  const option = select?.selectedOptions[0];

  if (!option || select.value === '') {
    return;
  }

  const clientName = field('client_name');
  const clientContact = field('client_contact');
  const clientTaxId = field('client_tax_id');
  const clientPhone = field('client_phone');

  if (clientName) {
    clientName.value = option.dataset.name ?? '';
  }
  if (clientContact) {
    clientContact.value = option.dataset.contact ?? '';
  }
  if (clientTaxId) {
    clientTaxId.value = option.dataset.taxId ?? '';
  }
  if (clientPhone) {
    clientPhone.value = option.dataset.phone ?? '';
  }
}

function updatePreview(): void {
  const items = readItems();
  const taxRate = Number(field('tax_rate')?.value ?? 0);
  const normalizedTaxRate = Number.isFinite(taxRate) ? taxRate : 0;
  const totals = computeTotals(items, normalizedTaxRate);

  setPreview('subject', field('subject')?.value || '報價單');
  setPreview('clientName', field('client_name')?.value || '未指定客戶');
  setPreview('clientContact', field('client_contact')?.value || '');
  setOptionalPreview('clientTaxId', field('client_tax_id')?.value || '');
  setPreview('clientPhone', field('client_phone')?.value || '');
  setPreview('quoteDate', field('quote_date')?.value || '');
  setPreview('validUntil', field('valid_until')?.value || '');
  setPreview('notes', field('notes')?.value || '');
  setPreview('subtotal', formatMoney(totals.subtotal));
  setTaxRowVisibility(normalizedTaxRate > 0);
  setPreview('taxRate', `${Math.round(normalizedTaxRate * 1000) / 10}%`);
  setPreview('taxAmount', formatMoney(totals.taxAmount));
  setPreview('total', formatMoney(totals.total));
  renderItems(items);
}

editor?.addEventListener('input', updatePreview);
editor?.addEventListener('change', (event) => {
  const target = event.target;

  if (target instanceof HTMLSelectElement && target.name === 'client_id') {
    syncClientFromSelect();
  }
  updatePreview();
});
editor?.querySelector('[data-add-item]')?.addEventListener('click', () => {
  const template = document.querySelector<HTMLTemplateElement>('[data-item-template]');
  const items = editor.querySelector<HTMLElement>('[data-items]');

  if (!template || !items) {
    return;
  }

  items.appendChild(template.content.cloneNode(true));
  updatePreview();
});
editor?.addEventListener('click', (event) => {
  const target = event.target;
  const button = target instanceof Element ? target.closest('[data-remove-item]') : null;

  if (!button || itemRows().length <= 1) {
    return;
  }

  button.closest('.item-row')?.remove();
  updatePreview();
});

updatePreview();
