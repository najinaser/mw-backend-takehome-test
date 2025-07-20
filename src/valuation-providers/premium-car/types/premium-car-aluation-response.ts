export type PremiumCarValuationXmlResponse = {
  root: {
    ValuationPrivateSaleMinimum: number;
    ValuationPrivateSaleMaximum: number;
    ValuationDealershipMinimum?: number;
    ValuationDealershipMaximum?: number;
  };
}
