using System;

namespace iManageCRM.Data.Models
{
    public class AdminSettings
    {
        public string Id { get; set; }
        public string CompanyName { get; set; }
        public string Address { get; set; }
        public string VatNumber { get; set; }
        public string LogoUrl { get; set; }
        public string SealUrl { get; set; }
        public string SignatureUrl { get; set; }
        public string QuoteNumberPattern { get; set; }
        public string Currency { get; set; }
        public string DefaultTerms { get; set; }
        public bool? ShowRevenueTrend { get; set; }
        public bool? ShowQuickActions { get; set; }
        public bool? ShowReports { get; set; }
        public bool? ShowVehicleDashboard { get; set; }
        public bool? ShowQuotationsInvoicesCard { get; set; }
        public bool? ShowQuotationsTwoPane { get; set; }
        public bool? ShowPurchaseOrdersTwoPane { get; set; }
        public bool? ShowInvoicesTwoPane { get; set; }
        public bool? ShowEmployeeSalariesCard { get; set; }
        public bool? ShowVehicleRevenueExpensesCard { get; set; }
        public bool? ShowActivityThisMonth { get; set; }
        public bool? ShowFinancialHealth { get; set; }
        public bool? ShowBusinessOverview { get; set; }
        public bool? ShowTopCustomers { get; set; }
        public bool? ShowActivitySummary { get; set; }
        public string FooterAddressEnglish { get; set; }
        public string FooterAddressArabic { get; set; }
        public string FooterContactEnglish { get; set; }
        public string FooterContactArabic { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
