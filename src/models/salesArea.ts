export interface AreaSales {
  area: string;
  lat: number;
  lon: number;
  state: string | null;
  resolution_level: "pincode" | "town" | "state";
  sold_qty: number;
  sold_amount: number;
  client_count: number;
}

export interface AreaClient {
  party_name: string;
  sold_qty: number;
  sold_amount: number;
  item_count: number;
}

export interface ClientItem {
  item: string;
  stock_group: string | null;
  sold_qty: number;
  sold_amount: number;
}

export interface PincodeSales {
  pincode: string;
  area: string;
  state: string | null;
  sold_qty: number;
  sold_amount: number;
  client_count: number;
}
