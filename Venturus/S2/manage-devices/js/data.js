/**
 * Manage Devices — Data module
 * Holds the units dataset, the Campus › Building Controller hierarchy, and status helpers.
 * Exposed on window.UnitsData.
 *
 * Data sourcing:
 *   - Managed units are sourced from Asset Registry (born READY onwards).
 *   - Registered units are sourced from Asset Registry as well, with a Building Controller complement filling in
 *     `Faculty / Floor / Room / Device IP` (the `lineServer` field tracks which
 *     Building Controller building controller provided the complement; it is not used for grouping in the UI).
 *
 * Status vocabulary (shared Asset Registry lifecycle):
 *   PENDING APPROVAL → registered, awaiting approval (Registered default on Add)
 *   READY            → registered via Atrium, or approved (Approve: PENDING APPROVAL → READY)
 *   PROVISIONED      → platform certs issued (outside Atrium)
 *   ACTIVE           → actor certs issued (outside Atrium); cannot be revoked
 *   RETIRED          → Reject/Retire (revocable from PENDING APPROVAL / READY / PROVISIONED)
 * Managed units are born READY. Registered units span PENDING APPROVAL → ACTIVE (+ RETIRED).
 * READY → PROVISIONED → ACTIVE transitions happen outside Atrium, not via the UI.
 */
(function() {
    'use strict';

    /**
     * Campus › Building Controller hierarchy. The Building Controller tree is retained because it identifies
     * which Building Controller building controller provides the complement data for each Registered unit, even
     * though scoping in the UI is Campus-only.
     * Shape: { id, name, children:[{id,name}] }
     */
    var LINE_SERVERS_DATA = [
        {
            id: 'NORT',
            name: 'NORT',
            children: [
                { id: 'nort-bc-1', name: 'nort-bc-1.campus.test' },
                { id: 'nort-bc-2', name: 'nort-bc-2.campus.test' },
                { id: 'nort-bc-3', name: 'nort-bc-3.campus.test' }
            ]
        },
        {
            id: 'HLSD',
            name: 'HLSD',
            children: [
                { id: 'hlsd-bc-1', name: 'hlsd-bc-1.campus.test' },
                { id: 'hlsd-bc-2', name: 'hlsd-bc-2.campus.test' }
            ]
        },
        {
            id: 'MEDS',
            name: 'MEDS',
            children: [
                { id: 'meds-bc-1', name: 'meds-bc-1.campus.test' },
                { id: 'meds-bc-2', name: 'meds-bc-2.campus.test' }
            ]
        }
    ];

    // Devices dataset. Both Managed and Registered rows come from Asset Registry.
    // Registered rows carry a `lineServer` reference indicating which Building Controller building controller
    // supplied the complement (Faculty / Floor / Room / Device IP).
    var unitsData = [
        /* ── Managed units (Asset Registry+Room Booking Manager) — born READY ── */
        { serialNumber: 'MICNORT4001', status: 'ACTIVE', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-101 Lecture Theatre', stationIP: '10.20.1.11', updatedBy: 'Priya Raman', updatedAt: '2025-12-01T14:23:15.000Z', lastHeardFrom: '2025-12-01T08:10:00.000Z' },
        { serialNumber: 'DRDNORT4002', status: 'PROVISIONED', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-101 Lecture Theatre', stationIP: '10.20.1.12', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-02T14:23:15.000Z', lastHeardFrom: '2025-12-04T09:11:00.000Z' },
        { serialNumber: 'PNLNORT4003', status: 'PROVISIONED', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-101 Lecture Theatre', stationIP: '10.20.1.13', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-03T14:23:15.000Z', lastHeardFrom: '2025-12-01T10:12:00.000Z' },
        { serialNumber: 'PRJNORT4004', status: 'PROVISIONED', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-101 Lecture Theatre', stationIP: '10.20.1.14', updatedBy: 'Lukas Brandt', updatedAt: '2025-12-04T14:23:15.000Z', lastHeardFrom: '2025-12-04T11:13:00.000Z' },
        { serialNumber: 'MICNORT4005', status: 'READY', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-101 Lecture Theatre', stationIP: '10.20.1.15', updatedBy: 'Priya Raman', updatedAt: '2025-12-05T14:23:15.000Z', lastHeardFrom: '' },
        { serialNumber: 'DRDNORT4006', status: 'READY', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-102 Seminar Room', stationIP: '10.20.2.11', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-06T14:23:15.000Z', lastHeardFrom: '' },
        { serialNumber: 'PNLNORT4007', status: 'READY', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-102 Seminar Room', stationIP: '10.20.2.12', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-01T14:23:15.000Z', lastHeardFrom: '' },
        { serialNumber: 'PRJNORT4008', status: 'READY', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-102 Seminar Room', stationIP: '10.20.2.13', updatedBy: 'Lukas Brandt', updatedAt: '2025-12-02T14:23:15.000Z', lastHeardFrom: '' },
        { serialNumber: 'MICNORT4009', status: 'ACTIVE', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-103 AV Lab', stationIP: '10.20.3.11', updatedBy: 'Priya Raman', updatedAt: '2025-12-03T14:23:15.000Z', lastHeardFrom: '2025-12-01T16:18:00.000Z' },
        { serialNumber: 'DRDNORT4010', status: 'ACTIVE', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-103 AV Lab', stationIP: '10.20.3.12', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-04T14:23:15.000Z', lastHeardFrom: '2025-12-04T17:19:00.000Z' },
        { serialNumber: 'PNLNORT4011', status: 'ACTIVE', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-103 AV Lab', stationIP: '10.20.3.13', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-05T14:23:15.000Z', lastHeardFrom: '2025-12-01T08:20:00.000Z' },
        { serialNumber: 'PRJNORT4012', status: 'ACTIVE', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-103 AV Lab', stationIP: '10.20.3.14', updatedBy: 'Lukas Brandt', updatedAt: '2025-12-06T14:23:15.000Z', lastHeardFrom: '2025-12-04T09:21:00.000Z' },
        { serialNumber: 'MICNORT4013', status: 'ACTIVE', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-103 AV Lab', stationIP: '10.20.3.15', updatedBy: 'Priya Raman', updatedAt: '2025-12-01T14:23:15.000Z', lastHeardFrom: '2025-12-01T10:22:00.000Z' },
        { serialNumber: 'DRDNORT4014', status: 'PROVISIONED', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-103 AV Lab', stationIP: '10.20.3.16', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-02T14:23:15.000Z', lastHeardFrom: '2025-12-04T11:23:00.000Z' },
        { serialNumber: 'PNLNORT4015', status: 'READY', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-104 Studio', stationIP: '10.20.4.11', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-03T14:23:15.000Z', lastHeardFrom: '' },
        { serialNumber: 'PRJNORT4016', status: 'READY', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-104 Studio', stationIP: '10.20.4.12', updatedBy: 'Lukas Brandt', updatedAt: '2025-12-04T14:23:15.000Z', lastHeardFrom: '' },
        { serialNumber: 'MICNORT4017', status: 'ACTIVE', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-105 Teaching Lab', stationIP: '10.20.5.11', updatedBy: 'Priya Raman', updatedAt: '2025-12-05T14:23:15.000Z', lastHeardFrom: '2025-12-01T14:26:00.000Z' },
        { serialNumber: 'DRDNORT4018', status: 'ACTIVE', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-105 Teaching Lab', stationIP: '10.20.5.12', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-06T14:23:15.000Z', lastHeardFrom: '2025-12-04T15:27:00.000Z' },
        { serialNumber: 'PNLNORT4019', status: 'ACTIVE', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-105 Teaching Lab', stationIP: '10.20.5.13', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-01T14:23:15.000Z', lastHeardFrom: '2025-12-01T16:28:00.000Z' },
        { serialNumber: 'PRJNORT4020', status: 'ACTIVE', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-105 Teaching Lab', stationIP: '10.20.5.14', updatedBy: 'Lukas Brandt', updatedAt: '2025-12-02T14:23:15.000Z', lastHeardFrom: '2025-12-04T17:29:00.000Z' },
        { serialNumber: 'MICNORT4021', status: 'ACTIVE', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-105 Teaching Lab', stationIP: '10.20.5.15', updatedBy: 'Priya Raman', updatedAt: '2025-12-03T14:23:15.000Z', lastHeardFrom: '2025-12-01T08:30:00.000Z' },
        { serialNumber: 'DRDNORT4022', status: 'ACTIVE', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-105 Teaching Lab', stationIP: '10.20.5.16', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-04T14:23:15.000Z', lastHeardFrom: '2025-12-04T09:31:00.000Z' },
        { serialNumber: 'PNLNORT4023', status: 'ACTIVE', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-105 Teaching Lab', stationIP: '10.20.5.17', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-05T14:23:15.000Z', lastHeardFrom: '2025-12-01T10:32:00.000Z' },
        { serialNumber: 'PRJNORT4024', status: 'ACTIVE', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L1', station: 'EN-105 Teaching Lab', stationIP: '10.20.5.18', updatedBy: 'Lukas Brandt', updatedAt: '2025-12-06T14:23:15.000Z', lastHeardFrom: '2025-12-04T11:33:00.000Z' },
        { serialNumber: 'MICNORT4025', status: 'ACTIVE', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L2', station: 'EN-201 Workshop', stationIP: '10.20.6.11', updatedBy: 'Priya Raman', updatedAt: '2025-12-01T14:23:15.000Z', lastHeardFrom: '2025-12-01T12:34:00.000Z' },
        { serialNumber: 'DRDNORT4026', status: 'ACTIVE', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L2', station: 'EN-201 Workshop', stationIP: '10.20.6.12', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-02T14:23:15.000Z', lastHeardFrom: '2025-12-04T13:35:00.000Z' },
        { serialNumber: 'PNLNORT4027', status: 'ACTIVE', type: 'Managed', site: 'NORT', project: 'ENG', lineName: 'Engineering L2', station: 'EN-202 Project Room', stationIP: '10.20.7.11', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-03T14:23:15.000Z', lastHeardFrom: '2025-12-01T14:36:00.000Z' },
        { serialNumber: 'PRJNORT4028', status: 'ACTIVE', type: 'Managed', site: 'NORT', project: 'SCI', lineName: 'Science Block L1', station: 'SB-110 Chemistry Lab', stationIP: '10.20.8.11', updatedBy: 'Lukas Brandt', updatedAt: '2025-12-04T14:23:15.000Z', lastHeardFrom: '2025-12-04T15:37:00.000Z' },
        { serialNumber: 'MICNORT4029', status: 'PROVISIONED', type: 'Managed', site: 'NORT', project: 'SCI', lineName: 'Science Block L1', station: 'SB-110 Chemistry Lab', stationIP: '10.20.8.12', updatedBy: 'Priya Raman', updatedAt: '2025-12-05T14:23:15.000Z', lastHeardFrom: '2025-12-01T16:38:00.000Z' },
        { serialNumber: 'DRDHLSD4030', status: 'ACTIVE', type: 'Managed', site: 'HLSD', project: 'ENG', lineName: 'Engineering L1', station: 'EN-101 Lecture Theatre', stationIP: '10.21.1.16', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-06T14:23:15.000Z', lastHeardFrom: '2025-12-04T17:39:00.000Z' },
        { serialNumber: 'PNLHLSD4031', status: 'ACTIVE', type: 'Managed', site: 'HLSD', project: 'ENG', lineName: 'Engineering L1', station: 'EN-101 Lecture Theatre', stationIP: '10.21.1.17', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-01T14:23:15.000Z', lastHeardFrom: '2025-12-01T08:40:00.000Z' },
        { serialNumber: 'PRJHLSD4032', status: 'PROVISIONED', type: 'Managed', site: 'HLSD', project: 'ENG', lineName: 'Engineering L1', station: 'EN-101 Lecture Theatre', stationIP: '10.21.1.18', updatedBy: 'Lukas Brandt', updatedAt: '2025-12-02T14:23:15.000Z', lastHeardFrom: '2025-12-04T09:41:00.000Z' },

        /* ── Registered units (Asset Registry with Building Controller complement) ──────────────────────────────
           Every Registered unit is Asset Registry-registered. The `lineServer` field identifies the
           Building Controller building controller that contributes Faculty / Floor / Room / Device IP.
           REGISTERED MODE: Registered units use only three statuses — ACTIVE / READY / RETIRED.
           (PENDING APPROVAL / PROVISIONED are not used in the Registered view.) */
        // Edge cases (unassigned building controller, unreachable building controller, partial complement)
        // are interleaved throughout the list rather than clumped, so the table shows a
        // realistic mix. Tagged inline: [unassigned] / [unreachable] / [partial:...].
        { serialNumber: 'MICNORT1001', status: 'READY', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-1', project: 'CS', lineName: 'Tech Centre L2', station: 'TC-S3', stationIP: '192.168.1.21', updatedBy: 'Priya Raman', updatedAt: '2025-12-05T08:01:12.000Z', lastHeardFrom: '2025-12-05T08:01:12.000Z' },
        { serialNumber: 'MICNORT1401', status: 'READY', type: 'Registered', site: 'NORT', lineServer: '', project: '', lineName: '', station: '', stationIP: '', updatedBy: 'Priya Raman', updatedAt: '2025-12-06T09:12:00.000Z', lastHeardFrom: '' }, // [unassigned]
        { serialNumber: 'DRDNORT1002', status: 'ACTIVE', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-1', project: 'CS', lineName: 'Tech Centre L2', station: 'TC-S4', stationIP: '192.168.1.22', updatedBy: 'Priya Raman', updatedAt: '2025-12-05T08:03:40.000Z', lastHeardFrom: '2025-12-05T08:03:40.000Z' },
        { serialNumber: 'MICNORT1501', status: 'READY', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-1', project: 'CS', lineName: 'Tech Centre L2', station: '', stationIP: '', updatedBy: 'Priya Raman', updatedAt: '2025-12-06T14:10:00.000Z', lastHeardFrom: '2025-12-06T14:10:00.000Z' }, // [partial: station + IP missing]
        { serialNumber: 'PNLNORT1003', status: 'RETIRED', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-1', project: 'CS', lineName: 'Tech Centre L2', station: 'TC-S5', stationIP: '192.168.1.23', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-05T09:14:05.000Z', lastHeardFrom: '2025-12-05T09:14:05.000Z' },
        { serialNumber: 'MICHLSD2001', status: 'RETIRED', type: 'Registered', site: 'HLSD', lineServer: 'hlsd-bc-1', project: 'SCI', lineName: 'Science Block L2', station: 'SB-B3', stationIP: '10.0.1.51', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-05T07:45:22.000Z', lastHeardFrom: '2025-12-05T07:45:22.000Z' },
        { serialNumber: 'MICHLSD2401', status: 'READY', type: 'Registered', site: 'HLSD', lineServer: 'hlsd-bc-1', project: '', lineName: '', station: '', stationIP: '', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-06T10:30:00.000Z', lastHeardFrom: '' }, // [unreachable]
        { serialNumber: 'DRDHLSD2002', status: 'READY', type: 'Registered', site: 'HLSD', lineServer: 'hlsd-bc-1', project: 'SCI', lineName: 'Science Block L2', station: 'SB-B4', stationIP: '10.0.1.52', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-05T07:52:10.000Z', lastHeardFrom: '2025-12-05T07:52:10.000Z' },
        { serialNumber: 'MICMEDS3001', status: 'READY', type: 'Registered', site: 'MEDS', lineServer: 'meds-bc-1', project: 'LIB', lineName: 'Library L2', station: 'LB-F1', stationIP: '172.16.1.71', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-05T06:55:48.000Z', lastHeardFrom: '2025-12-05T06:55:48.000Z' },
        { serialNumber: 'MICMEDS3401', status: 'READY', type: 'Registered', site: 'MEDS', lineServer: 'meds-bc-1', project: '', lineName: '', station: '', stationIP: '', updatedBy: 'Priya Raman', updatedAt: '2025-12-06T12:00:00.000Z', lastHeardFrom: '' }, // [unreachable]
        { serialNumber: 'PRJNORT1004', status: 'READY', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-2', project: 'CS', lineName: 'Tech Centre L1', station: 'TC-S1', stationIP: '192.168.2.31', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-05T09:20:55.000Z', lastHeardFrom: '2025-12-05T09:20:55.000Z' },
        { serialNumber: 'PRJNORT1404', status: 'READY', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-1', project: '', lineName: '', station: '', stationIP: '', updatedBy: 'Lukas Brandt', updatedAt: '2025-12-06T11:40:00.000Z', lastHeardFrom: '' }, // [unreachable]
        { serialNumber: 'MICNORT1005', status: 'ACTIVE', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-2', project: 'CS', lineName: 'Tech Centre L1', station: 'TC-S2', stationIP: '192.168.2.32', updatedBy: 'Priya Raman', updatedAt: '2025-12-05T10:02:18.000Z', lastHeardFrom: '2025-12-05T10:02:18.000Z' },
        { serialNumber: 'PNLHLSD2003', status: 'ACTIVE', type: 'Registered', site: 'HLSD', lineServer: 'hlsd-bc-1', project: 'SCI', lineName: 'Science Block L3', station: 'SB-C1', stationIP: '10.0.1.53', updatedBy: 'Lukas Brandt', updatedAt: '2025-12-05T08:30:44.000Z', lastHeardFrom: '2025-12-05T08:30:44.000Z' },
        { serialNumber: 'MICHLSD2501', status: 'READY', type: 'Registered', site: 'HLSD', lineServer: 'hlsd-bc-1', project: 'SCI', lineName: 'Science Block L2', station: '', stationIP: '', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-06T14:50:00.000Z', lastHeardFrom: '2025-12-06T14:50:00.000Z' }, // [partial: station + IP missing]
        { serialNumber: 'DRDMEDS3002', status: 'ACTIVE', type: 'Registered', site: 'MEDS', lineServer: 'meds-bc-1', project: 'LIB', lineName: 'Library L2', station: 'LB-F2', stationIP: '172.16.1.72', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-05T07:11:25.000Z', lastHeardFrom: '2025-12-05T07:11:25.000Z' },
        { serialNumber: 'DRDNORT1006', status: 'READY', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-3', project: 'MUS', lineName: 'Music Hall L4', station: 'MH-A1', stationIP: '192.168.3.41', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-05T11:33:09.000Z', lastHeardFrom: '2025-12-05T11:33:09.000Z' },
        { serialNumber: 'DRDNORT1502', status: 'ACTIVE', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-2', project: 'MUS', lineName: 'Music Hall L1', station: '', stationIP: '', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-06T14:35:00.000Z', lastHeardFrom: '2025-12-06T14:35:00.000Z' }, // [partial: station + IP missing]
        { serialNumber: 'PNLNORT1007', status: 'ACTIVE', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-3', project: 'MUS', lineName: 'Music Hall L4', station: 'MH-A2', stationIP: '192.168.3.42', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-05T11:40:51.000Z', lastHeardFrom: '2025-12-05T11:40:51.000Z' },
        { serialNumber: 'PNLMEDS3003', status: 'RETIRED', type: 'Registered', site: 'MEDS', lineServer: 'meds-bc-1', project: 'LIB', lineName: 'Library L3', station: 'LB-G1', stationIP: '172.16.1.73', updatedBy: 'Lukas Brandt', updatedAt: '2025-12-05T07:48:39.000Z', lastHeardFrom: '2025-12-05T07:48:39.000Z' },
        { serialNumber: 'DRDMEDS3402', status: 'ACTIVE', type: 'Registered', site: 'MEDS', lineServer: 'meds-bc-2', project: '', lineName: '', station: '', stationIP: '', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-06T12:48:00.000Z', lastHeardFrom: '' }, // [unreachable]
        { serialNumber: 'PRJHLSD2004', status: 'READY', type: 'Registered', site: 'HLSD', lineServer: 'hlsd-bc-2', project: 'SCI', lineName: 'Science Block L1', station: 'SB-D2', stationIP: '10.0.2.61', updatedBy: 'Lukas Brandt', updatedAt: '2025-12-05T08:55:30.000Z', lastHeardFrom: '2025-12-05T08:55:30.000Z' },
        { serialNumber: 'DRDNORT1402', status: 'ACTIVE', type: 'Registered', site: 'NORT', lineServer: '', project: '', lineName: '', station: '', stationIP: '', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-06T09:28:00.000Z', lastHeardFrom: '' }, // [unassigned]
        { serialNumber: 'MICHLSD2005', status: 'RETIRED', type: 'Registered', site: 'HLSD', lineServer: 'hlsd-bc-2', project: 'SCI', lineName: 'Science Block L1', station: 'SB-D3', stationIP: '10.0.2.62', updatedBy: 'Priya Raman', updatedAt: '2025-12-05T09:41:17.000Z', lastHeardFrom: '2025-12-05T09:41:17.000Z' },
        { serialNumber: 'PRJMEDS3004', status: 'READY', type: 'Registered', site: 'MEDS', lineServer: 'meds-bc-2', project: 'LIB', lineName: 'Library L1', station: 'LB-H2', stationIP: '172.16.2.81', updatedBy: 'Lukas Brandt', updatedAt: '2025-12-05T08:22:14.000Z', lastHeardFrom: '2025-12-05T08:22:14.000Z' },
        { serialNumber: 'PRJNORT1008', status: 'READY', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-1', project: 'CS', lineName: 'Tech Centre L3', station: 'TC-S6', stationIP: '192.168.1.24', updatedBy: 'Priya Raman', updatedAt: '2025-12-05T12:10:08.000Z', lastHeardFrom: '2025-12-05T12:10:08.000Z' },
        { serialNumber: 'MICNORT1405', status: 'ACTIVE', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-1', project: '', lineName: '', station: '', stationIP: '', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-06T12:22:00.000Z', lastHeardFrom: '' }, // [unreachable]
        { serialNumber: 'DRDHLSD2006', status: 'ACTIVE', type: 'Registered', site: 'HLSD', lineServer: 'hlsd-bc-2', project: 'GEO', lineName: 'Geosciences L5', station: 'GS-E1', stationIP: '10.0.2.63', updatedBy: 'Priya Raman', updatedAt: '2025-12-05T10:18:02.000Z', lastHeardFrom: '2025-12-05T10:18:02.000Z' },
        { serialNumber: 'MICMEDS3005', status: 'ACTIVE', type: 'Registered', site: 'MEDS', lineServer: 'meds-bc-2', project: 'BIO', lineName: 'Biosciences L6', station: 'BS-J1', stationIP: '172.16.2.82', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-05T09:05:57.000Z', lastHeardFrom: '2025-12-05T09:05:57.000Z' },
        { serialNumber: 'PNLNORT1503', status: 'READY', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-3', project: 'MUS', lineName: 'Music Hall L4', station: 'MH-A7', stationIP: '192.168.3.44', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-06T15:02:00.000Z', lastHeardFrom: '' }, // [partial: last heard from missing]
        { serialNumber: 'MICNORT1009', status: 'ACTIVE', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-2', project: 'MUS', lineName: 'Music Hall L2', station: 'MH-A3', stationIP: '192.168.2.33', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-05T12:44:19.000Z', lastHeardFrom: '2025-12-05T12:44:19.000Z' },
        { serialNumber: 'DRDMEDS3006', status: 'RETIRED', type: 'Registered', site: 'MEDS', lineServer: 'meds-bc-2', project: 'BIO', lineName: 'Biosciences L6', station: 'BS-J2', stationIP: '172.16.2.83', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-05T09:33:41.000Z', lastHeardFrom: '2025-12-05T09:33:41.000Z' },
        { serialNumber: 'DRDHLSD2402', status: 'ACTIVE', type: 'Registered', site: 'HLSD', lineServer: 'hlsd-bc-2', project: '', lineName: '', station: '', stationIP: '', updatedBy: 'Lukas Brandt', updatedAt: '2025-12-06T11:15:00.000Z', lastHeardFrom: '' }, // [unreachable]
        { serialNumber: 'PNLHLSD2007', status: 'ACTIVE', type: 'Registered', site: 'HLSD', lineServer: 'hlsd-bc-1', project: 'GEO', lineName: 'Geosciences L5', station: 'GS-E2', stationIP: '10.0.1.54', updatedBy: 'Priya Raman', updatedAt: '2025-12-05T13:02:33.000Z', lastHeardFrom: '2025-12-05T13:02:33.000Z' },
        { serialNumber: 'DRDNORT1406', status: 'READY', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-2', project: '', lineName: '', station: '', stationIP: '', updatedBy: 'Priya Raman', updatedAt: '2025-12-06T13:05:00.000Z', lastHeardFrom: '' }, // [unreachable]
        { serialNumber: 'PNLMEDS3007', status: 'READY', type: 'Registered', site: 'MEDS', lineServer: 'meds-bc-1', project: 'LIB', lineName: 'Library L4', station: 'LB-G2', stationIP: '172.16.1.74', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-05T13:25:50.000Z', lastHeardFrom: '2025-12-05T13:25:50.000Z' },
        { serialNumber: 'MICNORT1101', status: 'RETIRED', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-1', project: 'CS', lineName: 'Tech Centre L2', station: 'TC-S7', stationIP: '192.168.1.25', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-04T15:20:00.000Z', lastHeardFrom: '2025-12-05T07:30:00.000Z' },
        { serialNumber: 'PNLNORT1403', status: 'RETIRED', type: 'Registered', site: 'NORT', lineServer: '', project: '', lineName: '', station: '', stationIP: '', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-06T10:05:00.000Z', lastHeardFrom: '' }, // [unassigned]
        { serialNumber: 'DRDNORT1102', status: 'READY', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-2', project: 'MUS', lineName: 'Music Hall L1', station: 'MH-A4', stationIP: '192.168.2.34', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-04T16:05:00.000Z', lastHeardFrom: '2025-12-05T08:10:00.000Z' },
        { serialNumber: 'PRJNORT1504', status: 'ACTIVE', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-1', project: 'CS', lineName: 'Tech Centre L3', station: 'TC-S9', stationIP: '', updatedBy: 'Lukas Brandt', updatedAt: '2025-12-06T15:28:00.000Z', lastHeardFrom: '2025-12-06T15:28:00.000Z' }, // [partial: station IP missing]
        { serialNumber: 'PNLNORT1103', status: 'ACTIVE', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-3', project: 'MUS', lineName: 'Music Hall L4', station: 'MH-A5', stationIP: '192.168.3.43', updatedBy: 'Lukas Brandt', updatedAt: '2025-12-04T16:48:00.000Z', lastHeardFrom: '2025-12-05T09:00:00.000Z' },
        { serialNumber: 'MICHLSD2101', status: 'RETIRED', type: 'Registered', site: 'HLSD', lineServer: 'hlsd-bc-1', project: 'SCI', lineName: 'Science Block L2', station: 'SB-C2', stationIP: '10.0.1.55', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-04T14:12:00.000Z', lastHeardFrom: '2025-12-05T07:50:00.000Z' },
        { serialNumber: 'DRDHLSD2102', status: 'READY', type: 'Registered', site: 'HLSD', lineServer: 'hlsd-bc-2', project: 'SCI', lineName: 'Science Block L1', station: 'SB-D4', stationIP: '10.0.2.64', updatedBy: 'Tomás Herrera', updatedAt: '2025-12-04T17:30:00.000Z', lastHeardFrom: '2025-12-05T08:40:00.000Z' },
        { serialNumber: 'MICMEDS3101', status: 'RETIRED', type: 'Registered', site: 'MEDS', lineServer: 'meds-bc-1', project: 'LIB', lineName: 'Library L2', station: 'LB-F3', stationIP: '172.16.1.75', updatedBy: 'Lukas Brandt', updatedAt: '2025-12-04T13:55:00.000Z', lastHeardFrom: '2025-12-05T07:15:00.000Z' },
        { serialNumber: 'PNLNORT1407', status: 'ACTIVE', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-3', project: '', lineName: '', station: '', stationIP: '', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-06T13:41:00.000Z', lastHeardFrom: '' }, // [unreachable]
        { serialNumber: 'PNLHLSD2103', status: 'ACTIVE', type: 'Registered', site: 'HLSD', lineServer: 'hlsd-bc-2', project: 'GEO', lineName: 'Geosciences L5', station: 'GS-E3', stationIP: '10.0.2.65', updatedBy: 'Priya Raman', updatedAt: '2025-12-04T18:02:00.000Z', lastHeardFrom: '2025-12-05T09:20:00.000Z' },
        { serialNumber: 'DRDMEDS3102', status: 'READY', type: 'Registered', site: 'MEDS', lineServer: 'meds-bc-2', project: 'LIB', lineName: 'Library L1', station: 'LB-H3', stationIP: '172.16.2.84', updatedBy: 'Amara Nwosu', updatedAt: '2025-12-04T19:10:00.000Z', lastHeardFrom: '2025-12-05T10:05:00.000Z' },
        { serialNumber: 'MICNORT1201', status: 'READY', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-1', project: 'CS', lineName: 'Tech Centre L2', station: 'TC-S8', stationIP: '192.168.1.26', updatedBy: 'Tomás Herrera', updatedAt: '2025-11-30T11:30:00.000Z', lastHeardFrom: '2025-12-05T11:45:00.000Z' },
        { serialNumber: 'MICNORT1505', status: 'READY', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-2', project: 'MUS', lineName: '', station: '', stationIP: '', updatedBy: 'Priya Raman', updatedAt: '2025-12-06T15:55:00.000Z', lastHeardFrom: '2025-12-06T15:55:00.000Z' }, // [partial: line name + station + IP missing]
        { serialNumber: 'DRDMEDS3202', status: 'ACTIVE', type: 'Registered', site: 'MEDS', lineServer: 'meds-bc-1', project: 'LIB', lineName: 'Library L2', station: 'LB-F4', stationIP: '172.16.1.77', updatedBy: 'Lukas Brandt', updatedAt: '2025-11-30T15:05:00.000Z', lastHeardFrom: '2025-12-05T10:30:00.000Z' },
        { serialNumber: 'MICHLSD2201', status: 'READY', type: 'Registered', site: 'HLSD', lineServer: 'hlsd-bc-1', project: 'SCI', lineName: 'Science Block L3', station: 'SB-C3', stationIP: '10.0.1.56', updatedBy: 'Priya Raman', updatedAt: '2025-11-29T09:20:00.000Z', lastHeardFrom: '2025-12-05T12:00:00.000Z' },
        { serialNumber: 'DRDNORT1202', status: 'RETIRED', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-3', project: 'MUS', lineName: 'Music Hall L4', station: 'MH-A7', stationIP: '192.168.3.44', updatedBy: 'Amara Nwosu', updatedAt: '2025-11-29T18:40:00.000Z', lastHeardFrom: '2025-12-05T09:50:00.000Z' },
        { serialNumber: 'MICMEDS3201', status: 'ACTIVE', type: 'Registered', site: 'MEDS', lineServer: 'meds-bc-2', project: 'LIB', lineName: 'Library L1', station: 'LB-H4', stationIP: '172.16.2.85', updatedBy: 'Lukas Brandt', updatedAt: '2025-11-28T14:50:00.000Z', lastHeardFrom: '2025-12-05T13:20:00.000Z' },
        { serialNumber: 'DRDHLSD2202', status: 'ACTIVE', type: 'Registered', site: 'HLSD', lineServer: 'hlsd-bc-2', project: 'SCI', lineName: 'Science Block L1', station: 'SB-D5', stationIP: '10.0.2.66', updatedBy: 'Priya Raman', updatedAt: '2025-11-27T10:05:00.000Z', lastHeardFrom: '2025-12-05T12:40:00.000Z' },
        { serialNumber: 'MICNORT1301', status: 'RETIRED', type: 'Registered', site: 'NORT', lineServer: 'nort-bc-2', project: 'MUS', lineName: 'Music Hall L1', station: 'MH-A6', stationIP: '192.168.2.35', updatedBy: 'Amara Nwosu', updatedAt: '2025-11-26T10:15:00.000Z', lastHeardFrom: '2025-11-26T10:15:00.000Z' },
        { serialNumber: 'MICHLSD2301', status: 'RETIRED', type: 'Registered', site: 'HLSD', lineServer: 'hlsd-bc-1', project: 'SCI', lineName: 'Science Block L2', station: 'SB-C4', stationIP: '10.0.1.57', updatedBy: 'Tomás Herrera', updatedAt: '2025-11-27T16:40:00.000Z', lastHeardFrom: '2025-11-27T16:40:00.000Z' },
        { serialNumber: 'MICMEDS3301', status: 'RETIRED', type: 'Registered', site: 'MEDS', lineServer: 'meds-bc-1', project: 'LIB', lineName: 'Library L3', station: 'LB-G3', stationIP: '172.16.1.76', updatedBy: 'Priya Raman', updatedAt: '2025-11-25T13:05:00.000Z', lastHeardFrom: '2025-11-25T13:05:00.000Z' }
    ];

    /**
     * Map a status to its MDS tag variant (variants: primary/success/warning/danger/gray).
     */
    function getStatusTagVariant(status) {
        var statusMap = {
            'PENDING APPROVAL': 'warning',
            'READY': 'primary',
            'PROVISIONED': 'gray',
            'ACTIVE': 'success',
            'RETIRED': 'danger'
        };
        return statusMap[status] || 'gray';
    }

    /**
     * Resolve a line-server id (as stored on a unit's `lineServer`) to its display name
     * (e.g. `nort-bc-1` → `nort-bc-1.campus.test`). Falls back to the id itself.
     */
    function getLineServerName(id) {
        if (!id) return '';
        for (var i = 0; i < LINE_SERVERS_DATA.length; i++) {
            var children = LINE_SERVERS_DATA[i].children || [];
            for (var j = 0; j < children.length; j++) {
                if (children[j].id === id) return children[j].name;
            }
        }
        return id;
    }

    window.UnitsData = {
        units: unitsData,
        lineServers: LINE_SERVERS_DATA,
        getStatusTagVariant: getStatusTagVariant,
        getLineServerName: getLineServerName
    };
})();
