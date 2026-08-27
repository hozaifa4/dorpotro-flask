export interface NOARecord {
  id: string;
  tenderId: string;
  projectName: string;
  ministry: string;
  organization: string;
  procuringDistrict: string;
  procurementNature: 'Goods' | 'Works' | 'Services';
  awardedBidder: string;
  estimatedCostAmt: number;
  contractAmount: number;
  discountPct: number;
  awardDate: string;
  competitorsCount: number;
  scopeOfWork: string;
  status: 'Signed' | 'Completed' | 'Terminated';
  procurementMethod?: 'OTM' | 'LTM' | 'RFQ' | string;
  packageName?: string;
  packageNo?: string;
  budgetType?: string;
  contractValueTaka?: string;
  advertisementDate?: string;
  signingDate?: string;
  proposedStart?: string;
  proposedCompletion?: string;
  contractorTendererId?: string;
  contractorBeneficialOwner?: string;
  contractorAddress?: string;
  authorisedOfficer?: string;
}

export const mockNoaDataset: NOARecord[] = [
  {
    id: 'NOA-1226367-DPHE',
    tenderId: '1226367',
    projectName: 'Rural Sanitation Project',
    packageName: 'Construction of 1035 nos Twin pit Latrine in Sunamganj Sadar Upazila of Sunamganj District',
    packageNo: 'WDTPL-187',
    ministry: 'Ministry of Local Government Rural Development & Co-operatives',
    organization: 'Office of the Executive Engineer, DPHE, Sunamganj',
    procuringDistrict: 'Sunamganj',
    procurementNature: 'Works',
    awardedBidder: 'Green Constraction',
    estimatedCostAmt: 62500000,
    contractAmount: 59269305.55,
    discountPct: 5.17,
    awardDate: '2026-05-18',
    competitorsCount: 8,
    scopeOfWork: 'Construction of 1035 numbers of Twin Pit offset pour-flush latrines with reinforced concrete pipes, brick masonry superstructure, ventilation arrays, and sub-soil leaching systems matching DPHE structural designs in Sunamganj Sadar.',
    status: 'Signed',
    procurementMethod: 'OTM',
    budgetType: 'Development Government',
    advertisementDate: '2026-02-10',
    signingDate: '2026-06-08',
    proposedStart: '2026-07-15',
    proposedCompletion: '2027-12-23',
    contractorTendererId: '1021540',
    contractorBeneficialOwner: 'MD. UZZAL MIAH (100% ownership)',
    contractorAddress: 'HOLDING NO-1040-01 BLOCK NO-A DHANSHIRI-11 BANANIPARA, SUNAMGANJ SADAR, SUNAMGANJ.',
    authorisedOfficer: 'SYED KHALEDUL ISLAM (Executive Engineer)'
  },
  {
    id: 'NOA-1082-9921',
    tenderId: '1282055',
    projectName: 'Civil and sanitary repair work of public toilets at Sir Salimullah Medical College Mitford Hospital.',
    ministry: 'Ministry of Housing and Public Works',
    organization: 'Public Works Department (PWD)',
    procuringDistrict: 'Dhaka',
    procurementNature: 'Works',
    awardedBidder: 'Rahman & Sons Co.',
    estimatedCostAmt: 300000,
    contractAmount: 283500,
    discountPct: 5.5,
    awardDate: '2026-05-10',
    competitorsCount: 6,
    scopeOfWork: 'Repairing tile masonry, fitting and fixing high commode closets, plastic flushing tanks, master painting, plumbing pipelines and sanitary fittings.',
    status: 'Signed',
    procurementMethod: 'OTM'
  },
  {
    id: 'NOA-2910-3882',
    tenderId: '1282051',
    projectName: 'Cleaning of the septic tank, sockwell and sewage line of the X Block of Fazle Rabbi Hostel in Baksibazar under Dhaka Medical College.',
    ministry: 'Ministry of Housing and Public Works',
    organization: 'Public Works Department (PWD)',
    procuringDistrict: 'Dhaka',
    procurementNature: 'Works',
    awardedBidder: 'Anwar Construction Co.',
    estimatedCostAmt: 300000,
    contractAmount: 288000,
    discountPct: 4.0,
    awardDate: '2026-05-02',
    competitorsCount: 4,
    scopeOfWork: 'Silt lifting from pipeline, mechanical suction pumping, manual clearing of septic chambers and refitting sockwell lids.',
    status: 'Signed',
    procurementMethod: 'LTM'
  },
  {
    id: 'NOA-7731-1029',
    tenderId: '1278850',
    projectName: 'Sinking & Installation of 150 mm X 200 mm dia Upvc Deep tuble well including 38 mm dia test a observation well with External water supply pipe line at Sir Salimullah Medical College Hospital, Mitford, Dhaka.',
    ministry: 'Ministry of Housing and Public Works',
    organization: 'Public Works Department (PWD)',
    procuringDistrict: 'Dhaka',
    procurementNature: 'Works',
    awardedBidder: 'National Development Engineers (NDE)',
    estimatedCostAmt: 2500000,
    contractAmount: 2325000,
    discountPct: 7.0,
    awardDate: '2026-04-28',
    competitorsCount: 9,
    scopeOfWork: 'Borehole drilling down to 800 feet, installing heavy-duty UPVC casing, supplying and setting submersible pump motor, test pumping, chlorination, and external fittings.',
    status: 'Signed',
    procurementMethod: 'OTM'
  },
  {
    id: 'NOA-9921-2081',
    tenderId: '1152011',
    projectName: 'Emergency brick pavement repair along VIP Link Road (LGED Chittagong).',
    ministry: 'Ministry of Local Government Rural Development & Co-operatives',
    organization: 'Local Government Engineering Department (LGED)',
    procuringDistrict: 'Chittagong',
    procurementNature: 'Works',
    awardedBidder: 'Spectra Engineers Ltd.',
    estimatedCostAmt: 8500000,
    contractAmount: 7922000,
    discountPct: 6.8,
    awardDate: '2026-05-12',
    competitorsCount: 11,
    scopeOfWork: 'Subgrade preparation, sand cushioning, flat brick soling and herring-bone-bond brick pavement overlay spanning 1.5 kilometers of municipal shoulder.',
    status: 'Signed',
    procurementMethod: 'OTM'
  },
  {
    id: 'NOA-3351-4029',
    tenderId: '1168532',
    projectName: 'Supply and installation of split-type air conditioners at LGED HQ Annex B.',
    ministry: 'Ministry of Local Government Rural Development & Co-operatives',
    organization: 'Local Government Engineering Department (LGED)',
    procuringDistrict: 'Dhaka',
    procurementNature: 'Goods',
    awardedBidder: 'Cybernet Automation Bangladesh',
    estimatedCostAmt: 1200000,
    contractAmount: 1140000,
    discountPct: 5.0,
    awardDate: '2026-05-18',
    competitorsCount: 5,
    scopeOfWork: 'Delivering 15 units of 2.0 Ton smart inverter air conditioners, bracket fabrication, refrigerant piping, outdoor mounting, and testing.',
    status: 'Completed',
    procurementMethod: 'OTM'
  },
  {
    id: 'NOA-8219-4821',
    tenderId: '1231049',
    projectName: 'Renovation of administrative quarters and boundary masonry wall construction (PWD Sylhet).',
    ministry: 'Ministry of Housing and Public Works',
    organization: 'Public Works Department (PWD)',
    procuringDistrict: 'Sylhet',
    procurementNature: 'Works',
    awardedBidder: 'Sajjad & Brothers Joint Venture',
    estimatedCostAmt: 4500000,
    contractAmount: 4140000,
    discountPct: 8.0,
    awardDate: '2026-04-15',
    competitorsCount: 8,
    scopeOfWork: 'RCC beam reinforcement, brick masonry works up to 6 feet high, decorative grill installation, master plastering and weathering course insulation.',
    status: 'Completed',
    procurementMethod: 'OTM'
  },
  {
    id: 'NOA-6102-1299',
    tenderId: '1275990',
    projectName: 'Development of storm drainage network and RCC drain construction at Munshiganj Sadar secondary link roads.',
    ministry: 'Ministry of Local Government Rural Development & Co-operatives',
    organization: 'Local Government Engineering Department (LGED)',
    procuringDistrict: 'Gazipur',
    procurementNature: 'Works',
    awardedBidder: 'Delta Construction Ltd.',
    estimatedCostAmt: 3200000,
    contractAmount: 2976000,
    discountPct: 7.0,
    awardDate: '2026-04-20',
    competitorsCount: 7,
    scopeOfWork: 'Excavation, pre-cast slab casting, RCC culvert installation and roadside drainage channel construction.',
    status: 'Completed',
    procurementMethod: 'OTM'
  }
];
