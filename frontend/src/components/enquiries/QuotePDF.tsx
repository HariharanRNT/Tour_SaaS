import React from 'react';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet 
} from '@react-pdf/renderer';

// Define styles exactly as specified in the requirements (V3 Premium)
const styles = StyleSheet.create({
  page: {
    paddingTop: 80,
    paddingBottom: 60,
    paddingHorizontal: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    position: 'absolute',
    top: 30,
    left: 40,
    right: 40,
    borderBottomWidth: 1.5,
    borderBottomColor: '#1e3a5f',
    paddingBottom: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
  },
  headerRef: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
    textAlign: 'right',
  },
  headerPage: {
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 2,
  },
  hero: {
    backgroundColor: '#fcfcfc',
    padding: 15,
    borderWidth: 1,
    borderColor: '#eeeeee',
    marginVertical: 15,
    textAlign: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroCustomer: {
    fontSize: 12,
    color: '#2563eb',
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metaBox: {
    width: '24%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 6,
    textAlign: 'center',
  },
  metaLabel: {
    fontSize: 7,
    color: '#94a3b8',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 9,
    color: '#1e3a5f',
    fontFamily: 'Helvetica-Bold',
  },
  sectionCard: {
    marginBottom: 20,
  },
  packageHeader: {
    borderLeftWidth: 4,
    borderLeftColor: '#1e3a5f',
    paddingLeft: 10,
    marginBottom: 10,
  },
  packageTitle: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
  },
  packageSub: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    paddingBottom: 5,
    marginBottom: 10,
    marginTop: 20,
  },
  dayBlock: {
    marginBottom: 15,
  },
  dayLabel: {
    backgroundColor: '#1e3a5f',
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  timelineContent: {
    borderLeftWidth: 2,
    borderLeftColor: '#1e3a5f',
    marginLeft: 15,
    paddingLeft: 15,
  },
  activityTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  activityDesc: {
    fontSize: 9,
    color: '#64748b',
    lineHeight: 1.5,
  },
  pricingSection: {
    marginTop: 25,
    borderWidth: 1,
    borderColor: '#eeeeee',
    padding: 8,
  },
  tableHeader: {
    backgroundColor: '#1e3a5f',
    flexDirection: 'row',
    padding: 8,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  tableCell: {
    fontSize: 9,
    color: '#1e293b',
  },
  totalRow: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 2,
    borderTopColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
    marginRight: 10,
  },
  totalValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
  },
  col1: { width: '50%' },
  col2: { width: '10%', textAlign: 'center' },
  col3: { width: '20%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    paddingTop: 10,
    textAlign: 'center',
  },
  footerCta: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
    marginBottom: 4,
  },
  footerMain: {
    fontSize: 8,
    color: '#94a3b8',
  }
});

interface QuotePDFProps {
  enquiry: any;
  packages: any[];
  agent: any;
  priceMap: Record<string, number>;
}

export const QuotePDF = ({ enquiry, packages, agent, priceMap }: QuotePDFProps) => {
  const quoteRef = `ENQ-${enquiry.id.substring(0, 6).toUpperCase()}`;
  const travelDate = new Date(enquiry.travel_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* COMPACT FIXED HEADER */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Text style={styles.headerLogo}>{agent.agency_name || 'RNT Travels'}</Text>
          </View>
          <View>
            <Text style={styles.headerRef}>REF: {quoteRef}</Text>
            <Text style={styles.headerPage} render={({ pageNumber, totalPages }) => `PAGE ${pageNumber} OF ${totalPages}`} />
          </View>
        </View>

        {/* HERO SECTION */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Travel Quotation</Text>
          <Text style={styles.heroCustomer}>Prepared for {enquiry.customer_name}</Text>
        </View>

        {/* METADATA GRID */}
        <View style={styles.metaGrid}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Quote Ref</Text>
            <Text style={styles.metaValue}>{quoteRef}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Travel Date</Text>
            <Text style={styles.metaValue}>{travelDate}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Guests</Text>
            <Text style={styles.metaValue}>{enquiry.travellers} Person(s)</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Valid Until</Text>
            <Text style={styles.metaValue}>{validUntil}</Text>
          </View>
        </View>

        {/* PACKAGES LOOP */}
        {packages.map((pkg) => {
          const quotedPrice = priceMap[pkg.id] || pkg.price_per_person;
          const totalAmount = quotedPrice * enquiry.travellers;

          // Group Itinerary by Day
          const itineraryByDay: Record<number, any[]> = {};
          pkg.itinerary_items?.forEach((item: any) => {
            if (!itineraryByDay[item.day_number]) {
              itineraryByDay[item.day_number] = [];
            }
            itineraryByDay[item.day_number].push(item);
          });
          const sortedDays = Object.keys(itineraryByDay).map(Number).sort((a, b) => a - b);

          return (
            <View key={pkg.id} style={styles.sectionCard} break={packages.indexOf(pkg) > 0}>
              <View style={styles.packageHeader}>
                <Text style={styles.packageTitle}>{pkg.title}</Text>
                <Text style={styles.packageSub}>{pkg.duration_days} Days / {pkg.duration_nights} Nights in {pkg.destination}</Text>
              </View>

              <Text style={styles.sectionHeader}>Detailed Itinerary</Text>
              
              {sortedDays.map((dayNum) => (
                <View key={dayNum} style={styles.dayBlock} wrap={false}>
                  <View style={styles.dayLabel}>
                    <Text>DAY {dayNum}</Text>
                  </View>
                  
                  <View style={styles.timelineContent}>
                    {itineraryByDay[dayNum].map((item, idx) => (
                      <View key={idx} style={{ marginBottom: 12, position: 'relative' }}>
                        {/* Bullet indicator */}
                        <View style={{ position: 'absolute', left: -20, top: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#1e3a5f' }} />
                        <Text style={styles.activityTitle}>{item.title}</Text>
                        <Text style={styles.activityDesc}>{item.description}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              <View wrap={false}>
                <Text style={styles.sectionHeader}>Investment Details</Text>
                <View style={styles.pricingSection}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, styles.col1]}>Description</Text>
                    <Text style={[styles.tableHeaderText, styles.col2]}>Qty</Text>
                    <Text style={[styles.tableHeaderText, styles.col3]}>Unit Price</Text>
                    <Text style={[styles.tableHeaderText, styles.col4]}>Subtotal</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <View style={styles.col1}>
                      <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold' }]}>{pkg.title}</Text>
                      <Text style={[styles.tableCell, { fontSize: 7, color: '#64748b', marginTop: 2 }]}>Full Tour Experience</Text>
                    </View>
                    <Text style={[styles.tableCell, styles.col2]}>{enquiry.travellers}</Text>
                    <Text style={[styles.tableCell, styles.col3]}>₹ {quotedPrice.toLocaleString()}</Text>
                    <Text style={[styles.tableCell, styles.col4]}>₹ {totalAmount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Grand Total</Text>
                    <Text style={styles.totalValue}>₹ {totalAmount.toLocaleString()}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerCta}>Contact us to confirm your booking</Text>
          <Text style={styles.footerMain}>
            {agent.agency_name} | Created for {enquiry.customer_name}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
