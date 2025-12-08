import { IsString, IsOptional, IsNumber, IsDateString, IsIn } from 'class-validator';

export class GenerateFinanceReportDto {
  @IsString()
  @IsIn(['taxes', 'insurance', 'benefits', 'month-end', 'year-end'])
  reportType: 'taxes' | 'insurance' | 'benefits' | 'month-end' | 'year-end';

  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @IsOptional()
  @IsDateString()
  endDate?: Date;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsNumber()
  month?: number;

  @IsOptional()
  @IsString()
  entity?: string;
}

export interface TaxReportSummary {
  reportType: 'taxes';
  period: string;
  entity?: string;
  totalEmployees: number;
  taxBreakdown: {
    taxName: string;
    employeeCount: number;
    totalAmount: number;
    averageRate: number;
  }[];
  totalTaxCollected: number;
  generatedAt: Date;
}

export interface InsuranceReportSummary {
  reportType: 'insurance';
  period: string;
  entity?: string;
  totalEmployees: number;
  insuranceBreakdown: {
    insuranceName: string;
    employeeCount: number;
    employeeContribution: number;
    employerContribution: number;
    totalContribution: number;
    averageEmployeeRate: number;
    averageEmployerRate: number;
  }[];
  totalEmployeeContribution: number;
  totalEmployerContribution: number;
  totalInsuranceContribution: number;
  generatedAt: Date;
}

export interface BenefitsReportSummary {
  reportType: 'benefits';
  period: string;
  entity?: string;
  totalEmployees: number;
  benefitsBreakdown: {
    benefitType: 'allowances' | 'bonuses' | 'benefits' | 'refunds';
    benefitName: string;
    employeeCount: number;
    totalAmount: number;
  }[];
  totalBenefitsPaid: number;
  generatedAt: Date;
}

export interface MonthEndReportSummary {
  reportType: 'month-end';
  period: string;
  month: number;
  year: number;
  entity?: string;
  totalEmployees: number;
  totalGrossSalary: number;
  totalDeductions: number;
  totalNetPay: number;
  taxSummary: {
    taxName: string;
    totalAmount: number;
  }[];
  insuranceSummary: {
    insuranceName: string;
    employeeContribution: number;
    employerContribution: number;
  }[];
  benefitsSummary: {
    allowances: number;
    bonuses: number;
    benefits: number;
    refunds: number;
  };
  payrollRuns: number;
  generatedAt: Date;
}

export interface YearEndReportSummary {
  reportType: 'year-end';
  year: number;
  entity?: string;
  totalEmployees: number;
  monthlyBreakdown: {
    month: number;
    monthName: string;
    totalGrossSalary: number;
    totalDeductions: number;
    totalNetPay: number;
    employeeCount: number;
    payrollRuns: number;
  }[];
  annualTotals: {
    totalGrossSalary: number;
    totalDeductions: number;
    totalNetPay: number;
    totalTaxes: number;
    totalInsurance: number;
    totalBenefits: number;
  };
  taxSummary: {
    taxName: string;
    annualTotal: number;
  }[];
  insuranceSummary: {
    insuranceName: string;
    annualEmployeeContribution: number;
    annualEmployerContribution: number;
  }[];
  generatedAt: Date;
}

export type FinanceReportResponse = 
  | TaxReportSummary 
  | InsuranceReportSummary 
  | BenefitsReportSummary 
  | MonthEndReportSummary 
  | YearEndReportSummary;
