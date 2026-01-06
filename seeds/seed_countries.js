// seeds/seed_countries.js

exports.seed = async function (knex) {
    await knex('countries').del();

    await knex('countries').insert([
        // -------------------- Australia Cluster --------------------
        {
            cluster_name: 'Australia',
            country_name: 'Australia',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Australia',
            ddh_retail: 'Australia',
            foresights: 'Australia',
            kantar: 'Australia'
        },
        {
            cluster_name: 'Australia',
            country_name: 'New Zealand',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'New Zealand',
            ddh_retail: 'New Zealand',
            foresights: 'New Zealand',
            kantar: 'New Zealand'
        },

        // -------------------- Brazil --------------------
        {
            cluster_name: 'Brazil',
            country_name: 'Brazil',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Brazil',
            ddh_retail: 'Brazil',
            foresights: 'Brazil',
            kantar: 'Brazil'
        },

        // -------------------- Benelux and Nordics --------------------
        {
            cluster_name: 'Benelux and Nordics',
            country_name: 'Belgium',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Belgium',
            ddh_retail: 'Belgium',
            foresights: 'Belgium',
            kantar: 'Belgium'
        },
        {
            cluster_name: 'Benelux and Nordics',
            country_name: 'Denmark',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Denmark',
            ddh_retail: 'Denmark',
            foresights: 'Denmark',
            kantar: 'Denmark'
        },
        {
            cluster_name: 'Benelux and Nordics',
            country_name: 'Finland',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Finland',
            ddh_retail: 'Finland',
            foresights: 'Finland',
            kantar: 'Finland'
        },
        {
            cluster_name: 'Benelux and Nordics',
            country_name: 'Netherlands',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Netherlands',
            ddh_retail: 'Netherlands',
            foresights: 'Netherlands',
            kantar: 'Netherlands'
        },
        {
            cluster_name: 'Benelux and Nordics',
            country_name: 'Norway',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Norway',
            ddh_retail: 'Norway',
            foresights: 'Norway',
            kantar: 'Norway'
        },
        {
            cluster_name: 'Benelux and Nordics',
            country_name: 'Sweden',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Sweden',
            ddh_retail: 'Sweden',
            foresights: 'Sweden',
            kantar: 'Sweden'
        },
        {
            cluster_name: 'Benelux and Nordics',
            country_name: 'Iceland',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Iceland',
            ddh_retail: 'Iceland',
            foresights: 'Iceland',
            kantar: 'Iceland'
        },

        // -------------------- CCV (Main) --------------------
        {
            cluster_name: 'CCV',
            country_name: 'Costa Rica',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Costa Rica',
            ddh_retail: 'Costa Rica',
            foresights: 'Costa Rica',
            kantar: 'Costa Rica'
        },
        {
            cluster_name: 'CCV',
            country_name: 'Dominican Republic',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Dominican Republic',
            ddh_retail: 'Dominican Republic',
            foresights: 'Dominican Republic',
            kantar: 'Republica Dominicana'
        },
        {
            cluster_name: 'CCV',
            country_name: 'Guatemala',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Guatemala',
            ddh_retail: 'Guatemala',
            foresights: 'Guatemala',
            kantar: 'Guatemala'
        },
        {
            cluster_name: 'CCV',
            country_name: 'Puerto Rico',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Puerto Rico',
            ddh_retail: 'Puerto Rico',
            foresights: 'Puerto Rico',
            kantar: 'Puerto Rico'
        },

        // -------------------- CCV Venture Central America --------------------
        {
            cluster_name: 'CCV',
            country_name: 'Venture Central America',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: '',
            ddh_retail: '',
            foresights: '',
            kantar: '',
            is_cluster_country: true,
            mapped_ddh_iwsr: JSON.stringify(['El Salvador', 'Honduras', 'Nicaragua', 'Panama']),
            mapped_ddh_retails: JSON.stringify(['El Salvador', 'Honduras', 'Nicaragua', 'Panama']),
            mapped_forsight: JSON.stringify(['El Salvador', 'Honduras', 'Nicaragua', 'Panama']),
            mapped_kantar: JSON.stringify(['El Salvador', 'Honduras', 'Nicaragua', 'Panama']),
        },
        {
            cluster_name: 'CCV',
            country_name: 'Venture Caribbean Adhoc',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: '',
            ddh_retail: '',
            foresights: '',
            kantar: '',
            is_cluster_country: true,
            mapped_ddh_iwsr: JSON.stringify([
                'Antigua & Barbuda', 'Aruba', 'Bahamas', 'Barbados', 'Belize', 'Bermuda',
                'Virgin Isl. (Brit.)', 'Cayman Islands', 'Cuba', 'Curacao', 'French Guiana',
                'Grenada', 'Guadeloupe', 'Guyana', 'Haiti', 'Jamaica', 'Martinique',
                'Sint Maarten', 'St. Barthelemy', 'St. Kitts and Nevis', 'St. Lucia',
                'St. Vincent and the Grenadines', 'Suriname', 'Trinidad and Tobago',
                'Turks and Caicos', 'Virgin Isl. (USA)'
            ]),
            mapped_ddh_retails: JSON.stringify([
                'Antigua & Barbuda', 'Aruba', 'Bahamas', 'Barbados', 'Belize', 'Bermuda',
                'Virgin Isl. (Brit.)', 'Cayman Islands', 'Cuba', 'Curacao', 'French Guiana',
                'Grenada', 'Guadeloupe', 'Guyana', 'Haiti', 'Martinique',
                'Sint Maarten', 'St. Barthelemy', 'St. Kitts and Nevis', 'St. Lucia',
                'St. Vincent and the Grenadines', 'Suriname', 'Trinidad and Tobago',
                'Turks and Caicos', 'Virgin Isl. (USA)'
            ]),
            mapped_forsight: JSON.stringify([
                'Antigua & Barbuda', 'Aruba', 'Bahamas', 'Barbados', 'Belize', 'Bermuda',
                'British Virgin Island', 'Cayman Islands', 'Cuba', 'Curacao', 'French Guiana',
                'Grenada', 'Guadeloupe', 'Guyana', 'Haiti', 'Martinique',
                'Sint Maarten', 'Saint Barthelemy', 'Saint Kitts and Nevis', 'Saint Lucia',
                'Saint Vincent and the Grenadines', 'Suriname', 'Trinidad and Tobago',
                'Turks and Caicos Inslands', 'U.S. Virgin Islands'
            ]),
            mapped_kantar: JSON.stringify([
                'Antigua', 'Aruba', 'Bahamas', 'Barbados', 'Belize', 'Bermuda',
                'British Virgin Islands', 'Cayman Islands', 'Cuba', 'Curacao', 'French Guiana',
                'Grenada', 'Guadeloupe', 'Guyana', 'Haiti', 'Martinique',
                'Sint Maarten', 'St Barths', 'St Kitts', 'St Lucia',
                'St Vincent and the Grenadines', 'Suriname', 'Trinidad Y Tobago',
                'Turks and Caicos', 'US Virgin Islands'
            ]),
        },
        {
            cluster_name: 'CCV',
            country_name: 'Venture Caribbean BGS',
            bgs_adhoc: 'BGS',
            ddh_iwsr: '',
            ddh_retail: '',
            foresights: '',
            kantar: '',
            is_cluster_country: true,
            mapped_ddh_iwsr: JSON.stringify([
                'Jamaica'
            ]),
            mapped_ddh_retails: JSON.stringify([
                'Jamaica'
            ]),
            mapped_forsight: JSON.stringify([
                'Jamaica'
            ]),
            mapped_kantar: JSON.stringify([
                'Jamaica'
            ]),
        },
        {
            cluster_name: 'CCV',
            country_name: 'Venezuela',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Venezuela',
            ddh_retail: 'Venezuela',
            foresights: 'Venezuela',
            kantar: 'Venezuela'
        },

        // -------------------- Colombia --------------------
        {
            cluster_name: 'Colombia',
            country_name: 'Colombia',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Colombia',
            ddh_retail: 'Colombia',
            foresights: 'Colombia',
            kantar: 'Colombia'
        },
        // -------------------- DACH --------------------
        {
            cluster_name: 'DACH',
            country_name: 'Germany',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Germany',
            ddh_retail: 'Germany',
            foresights: 'Germany',
            kantar: 'Germany'
        },
        {
            cluster_name: 'DACH',
            country_name: 'Austria',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Austria',
            ddh_retail: 'Austria',
            foresights: 'Austria',
            kantar: 'Austria'
        },
        {
            cluster_name: 'DACH',
            country_name: 'Switzerland',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Switzerland',
            ddh_retail: 'Switzerland',
            foresights: 'Switzerland',
            kantar: 'Switzerland'
        },

        // -------------------- East Africa --------------------
        {
            cluster_name: 'East Africa',
            country_name: 'Kenya',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Kenya',
            ddh_retail: 'Kenya',
            foresights: 'Kenya',
            kantar: 'Kenya'
        },
        {
            cluster_name: 'East Africa',
            country_name: 'Tanzania',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Tanzania',
            ddh_retail: 'Tanzania',
            foresights: 'Tanzania',
            kantar: 'Tanzania'
        },
        {
            cluster_name: 'East Africa',
            country_name: 'Uganda',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Uganda',
            ddh_retail: 'Uganda',
            foresights: 'Uganda',
            kantar: 'Uganda'
        },

        // -------------------- Eastern Europe --------------------
        {
            cluster_name: 'Eastern Europe',
            country_name: 'Bulgaria',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Bulgaria',
            ddh_retail: 'Bulgaria',
            foresights: 'Bulgaria',
            kantar: 'Bulgaria',
        },
        {
            cluster_name: 'Eastern Europe',
            country_name: 'Croatia',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Croatia',
            ddh_retail: 'Croatia',
            foresights: 'Croatia',
            kantar: 'Croatia'
        },
        {
            cluster_name: 'Eastern Europe',
            country_name: 'Czech Republic',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Czechia',
            ddh_retail: 'Czechia',
            foresights: 'Czechia',
            kantar: 'Czech Republic'
        },
        {
            cluster_name: 'Eastern Europe',
            country_name: 'Hungary',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Hungary',
            ddh_retail: 'Hungary',
            foresights: 'Hungary',
            kantar: 'Hungary'
        },
        {
            cluster_name: 'Eastern Europe',
            country_name: 'Romania',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Romania',
            ddh_retail: 'Romania',
            foresights: 'Romania',
            kantar: 'Romania'
        },
        {
            cluster_name: 'Eastern Europe',
            country_name: 'Israel',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Israel',
            ddh_retail: 'Israel',
            foresights: 'Israel',
            kantar: 'Israel'
        },
        {
            cluster_name: 'Eastern Europe',
            country_name: 'Kazakhstan',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Kazakhstan',
            ddh_retail: 'Kazakhstan',
            foresights: 'Kazakhstan',
            kantar: 'Kazakhstan'
        },
        {
            cluster_name: 'Eastern Europe',
            country_name: 'Slovakia',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Slovakia',
            ddh_retail: 'Slovakia',
            foresights: 'Slovakia',
            kantar: 'Slovakia'
        },
        {
            cluster_name: 'Eastern Europe',
            country_name: 'Ukraine',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Ukraine',
            ddh_retail: 'Ukraine',
            foresights: 'Ukraine',
            kantar: 'Ukraine'
        },

        // -------------------- Eastern Europe – Baltic --------------------
        {
            cluster_name: 'Eastern Europe',
            country_name: 'Baltic',
            bgs_adhoc: 'BGS',
            ddh_iwsr: '',
            ddh_retail: '',
            foresights: '',
            kantar: '',
            is_cluster_country: true,
            mapped_ddh_iwsr: JSON.stringify(['Estonia', 'Latvia', 'Lithuania', 'Panama']),
            mapped_ddh_retails: JSON.stringify(['Estonia', 'Latvia', 'Lithuania', 'Panama']),
            mapped_forsight: JSON.stringify(['Estonia', 'Latvia', 'Lithuania', 'Panama']),
            mapped_kantar: JSON.stringify(['Estonia', 'Latvia', 'Lithuania', 'Panama']),
        },
        // -------------------- Eastern Europe – All Other --------------------
        {
            cluster_name: 'Eastern Europe',
            country_name: 'All Other',
            bgs_adhoc: 'BGS',
            ddh_iwsr: '',
            ddh_retail: '',
            foresights: '',
            kantar: '',
            is_cluster_country: true,
            mapped_ddh_iwsr: JSON.stringify([
                'Albania', 'Armenia', 'Azerbaijan', 'Belarus', 'Bosnia and Herzegovina',
                'Cyprus', 'Georgia', 'Kosovo', 'Kyrgyzstan', 'North Macedonia',
                'Malta', 'Moldova', 'Montenegro', 'Serbia', 'Slovenia',
                'Tajikistan', 'Turkmenistan', 'Uzbekistan'
            ]),
            mapped_ddh_retails: JSON.stringify([
                'Albania', 'Armenia', 'Azerbaijan', 'Belarus', 'Bosnia and Herzegovina',
                'Cyprus', 'Georgia', 'Kosovo', 'Kyrgyzstan', 'North Macedonia',
                'Malta', 'Moldova', 'Montenegro', 'Serbia', 'Slovenia',
                'Tajikistan', 'Turkmenistan', 'Uzbekistan'
            ]),
            mapped_forsight: JSON.stringify([
                'Albania', 'Armenia', 'Azerbaijan', 'Belarus', 'Bosnia and Herzegovina',
                'Cyprus', 'Georgia', 'Kosovo', 'Kyrgyzstan', 'Macedonia',
                'Malta', 'Moldova', 'Montenegro', 'Serbia',
                'Slovakia', 'Slovenia', 'Tajikistan', 'Turkmenistan', 'Uzbekistan'
            ]),
            mapped_kantar: JSON.stringify([
                'Albania', 'Armenia', 'Azerbaijan', 'Belarus', 'Bosnia-Herzegovina',
                'Cyprus', 'Georgia', 'Kosovo', 'Kyrgyzstan', 'North Macedonia',
                'Malta', 'Moldova', 'Montenegro', 'Serbia', 'Slovenia',
                'Tajikistan', 'Turkmenistan', 'Uzbekistan'
            ]),
        },
        // -------------------- GB --------------------
        {
            cluster_name: 'GB',
            country_name: 'United Kingdom',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Great Britain',
            ddh_retail: 'Great Britain',
            foresights: 'United Kingdom',
            kantar: 'Great Britain'
        },

        // -------------------- Greater China --------------------
        {
            cluster_name: 'Greater China',
            country_name: 'China',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'China',
            ddh_retail: 'China',
            foresights: 'China',
            kantar: 'China'
        },
        {
            cluster_name: 'Greater China',
            country_name: 'Hong Kong',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Hong Kong S.A.R. China',
            ddh_retail: 'Hong Kong S.A.R. China',
            foresights: 'Hong Kong',
            kantar: 'Hong Kong'
        },
        {
            cluster_name: 'Greater China',
            country_name: 'Taiwan',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Taiwan',
            ddh_retail: 'Taiwan',
            foresights: 'Taiwan',
            kantar: 'Taiwan'
        },

        // -------------------- Greece --------------------
        {
            cluster_name: 'Greece',
            country_name: 'Greece',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Greece',
            ddh_retail: 'Greece',
            foresights: 'Greece',
            kantar: 'Greece'
        },

        // -------------------- Iberia --------------------
        {
            cluster_name: 'Iberia',
            country_name: 'Portugal',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Portugal',
            ddh_retail: 'Portugal',
            foresights: 'Portugal',
            kantar: 'Portugal'
        },
        {
            cluster_name: 'Iberia',
            country_name: 'Spain',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Spain',
            ddh_retail: 'Spain',
            foresights: 'Spain',
            kantar: 'Spain'
        },

        // -------------------- India --------------------
        {
            cluster_name: 'India',
            country_name: 'India',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'India',
            ddh_retail: 'India',
            foresights: 'India',
            kantar: 'India'
        },
        // -------------------- Ireland --------------------
        {
            cluster_name: 'Ireland',
            country_name: 'Island of Ireland',
            bgs_adhoc: 'BGS',
            ddh_iwsr: '',
            ddh_retail: '-',
            foresights: 'Island of Ireland',
            kantar: 'Island of Ireland'
        },
        {
            cluster_name: 'Ireland',
            country_name: 'Northern Ireland',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Northern Ireland',
            ddh_retail: 'Northern Ireland',
            foresights: 'Ireland',
            kantar: 'Northern Ireland'
        },
        {
            cluster_name: 'Ireland',
            country_name: 'Republic of Ireland',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Republic Of Ireland',
            ddh_retail: 'Republic Of Ireland',
            foresights: 'Ireland',
            kantar: 'Republic of Ireland'
        },

        // -------------------- Japan --------------------
        {
            cluster_name: 'Japan',
            country_name: 'Japan',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Japan',
            ddh_retail: 'Japan',
            foresights: 'Japan',
            kantar: 'Japan'
        },

        // -------------------- Korea --------------------
        {
            cluster_name: 'Korea',
            country_name: 'South Korea',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'South Korea',
            ddh_retail: 'South Korea',
            foresights: 'South Korea',
            kantar: 'Korea'
        },

        // -------------------- MENA --------------------
        {
            cluster_name: 'MENA',
            country_name: 'Afghanistan',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Afghanistan',
            ddh_retail: 'Afghanistan',
            foresights: 'Afghanistan',
            kantar: 'Afghanistan'
        },
        {
            cluster_name: 'MENA',
            country_name: 'Bahrain',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Bahrain',
            ddh_retail: 'Bahrain',
            foresights: 'Bahrain',
            kantar: 'Bahrain'
        },
        {
            cluster_name: 'MENA',
            country_name: 'Egypt',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Egypt',
            ddh_retail: 'Egypt',
            foresights: 'Egypt',
            kantar: 'Egypt'
        },
        {
            cluster_name: 'MENA',
            country_name: 'Iran',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Iran',
            ddh_retail: 'Iran',
            foresights: 'Iran',
            kantar: 'Iran'
        },
        {
            cluster_name: 'MENA',
            country_name: 'Iraq',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Iraq',
            ddh_retail: 'Iraq',
            foresights: 'Iraq',
            kantar: 'Iraq'
        },
        {
            cluster_name: 'MENA',
            country_name: 'Jordan',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Jordan',
            ddh_retail: 'Jordan',
            foresights: 'Jordan',
            kantar: 'Jordan'
        },
        {
            cluster_name: 'MENA',
            country_name: 'Kuwait',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Kuwait',
            ddh_retail: 'Kuwait',
            foresights: 'Kuwait',
            kantar: 'Kuwait'
        },
        {
            cluster_name: 'MENA',
            country_name: 'Lebanon',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Lebanon',
            ddh_retail: 'Lebanon',
            foresights: 'Lebanon',
            kantar: 'Lebanon'
        },
        {
            cluster_name: 'MENA',
            country_name: 'Morocco',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Morocco',
            ddh_retail: 'Morocco',
            foresights: 'Morocco',
            kantar: 'Morocco'
        },
        {
            cluster_name: 'MENA',
            country_name: 'Oman',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Oman',
            ddh_retail: 'Oman',
            foresights: 'Oman',
            kantar: 'Oman'
        },
        {
            cluster_name: 'MENA',
            country_name: 'Pakistan',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Pakistan',
            ddh_retail: 'Pakistan',
            foresights: 'Pakistan',
            kantar: 'Pakistan'
        },
        {
            cluster_name: 'MENA',
            country_name: 'Qatar',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Qatar',
            ddh_retail: 'Qatar',
            foresights: 'Qatar',
            kantar: 'Qatar'
        },
        {
            cluster_name: 'MENA',
            country_name: 'Saudi Arabia',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Saudi Arabia',
            ddh_retail: 'Saudi Arabia',
            foresights: 'Saudi Arabia',
            kantar: 'Saudi Arabia'
        },
        {
            cluster_name: 'MENA',
            country_name: 'Syria',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Syrian Arab Republic',
            ddh_retail: 'Syrian Arab Republic',
            foresights: 'Syria',
            kantar: 'Syria'
        },
        {
            cluster_name: 'MENA',
            country_name: 'Tunisia',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Tunisia',
            ddh_retail: 'Tunisia',
            foresights: 'Tunisia',
            kantar: 'Tunisia'
        },
        {
            cluster_name: 'MENA',
            country_name: 'United Arab Emirates',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'United Arab Emirates',
            ddh_retail: 'United Arab Emirates',
            foresights: 'United Arab Emirates',
            kantar: 'UAE'
        },

        // -------------------- Mexico --------------------
        {
            cluster_name: 'Mexico',
            country_name: 'Mexico',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Mexico',
            ddh_retail: 'Mexico',
            foresights: 'Mexico',
            kantar: 'Mexico'
        },

        // -------------------- NAM --------------------
        {
            cluster_name: 'NAM',
            country_name: 'USA',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'United States of America',
            ddh_retail: 'United States of America',
            foresights: 'United States of America',
            kantar: 'US'
        },
        {
            cluster_name: 'NAM',
            country_name: 'Canada',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Canada',
            ddh_retail: 'Canada',
            foresights: 'Canada',
            kantar: 'Canada'
        },
        // -------------------- Nigeria --------------------
        {
            cluster_name: 'Nigeria',
            country_name: 'Nigeria',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Nigeria',
            ddh_retail: 'Nigeria',
            foresights: 'Nigeria',
            kantar: 'Nigeria'
        },

        // -------------------- Poland --------------------
        {
            cluster_name: 'Poland',
            country_name: 'Poland',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Poland',
            ddh_retail: 'Poland',
            foresights: 'Poland',
            kantar: 'Poland'
        },

        // -------------------- SEA --------------------
        {
            cluster_name: 'SEA',
            country_name: 'Cambodia',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Cambodia',
            ddh_retail: 'Cambodia',
            foresights: 'Cambodia',
            kantar: 'Cambodia'
        },
        {
            cluster_name: 'SEA',
            country_name: 'Indonesia',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Indonesia',
            ddh_retail: 'Indonesia',
            foresights: 'Indonesia',
            kantar: 'Indonesia'
        },
        {
            cluster_name: 'SEA',
            country_name: 'Laos',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Laos',
            ddh_retail: 'Laos',
            foresights: 'Laos',
            kantar: 'Laos'
        },
        {
            cluster_name: 'SEA',
            country_name: 'Malaysia',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Malaysia',
            ddh_retail: 'Malaysia',
            foresights: 'Malaysia',
            kantar: 'Malaysia'
        },
        {
            cluster_name: 'SEA',
            country_name: 'Myanmar',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Myanmar',
            ddh_retail: 'Myanmar',
            foresights: 'Myanmar',
            kantar: 'Myanmar'
        },
        {
            cluster_name: 'SEA',
            country_name: 'Philippines',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Philippines',
            ddh_retail: 'Philippines',
            foresights: 'Philippines',
            kantar: 'Philippines'
        },
        {
            cluster_name: 'SEA',
            country_name: 'Singapore',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Singapore',
            ddh_retail: 'Singapore',
            foresights: 'Singapore',
            kantar: 'Singapore'
        },
        {
            cluster_name: 'SEA',
            country_name: 'Sri Lanka',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Sri Lanka',
            ddh_retail: 'Sri Lanka',
            foresights: 'Sri Lanka',
            kantar: 'Sri Lanka'
        },
        {
            cluster_name: 'SEA',
            country_name: 'Thailand',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Thailand',
            ddh_retail: 'Thailand',
            foresights: 'Thailand',
            kantar: 'Thailand'
        },
        {
            cluster_name: 'SEA',
            country_name: 'Vietnam',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Vietnam',
            ddh_retail: 'Vietnam',
            foresights: 'Vietnam',
            kantar: 'Vietnam'
        },

        // -------------------- South LAC --------------------
        {
            cluster_name: 'South LAC',
            country_name: 'Argentina',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Argentina',
            ddh_retail: 'Argentina',
            foresights: 'Argentina',
            kantar: 'Argentina'
        },
        {
            cluster_name: 'South LAC',
            country_name: 'Bolivia',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Bolivia',
            ddh_retail: 'Bolivia',
            foresights: 'Bolivia',
            kantar: 'Bolivia'
        },
        {
            cluster_name: 'South LAC',
            country_name: 'Chile',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Chile',
            ddh_retail: 'Chile',
            foresights: 'Chile',
            kantar: 'Chile'
        },
        {
            cluster_name: 'South LAC',
            country_name: 'Ecuador',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Ecuador',
            ddh_retail: 'Ecuador',
            foresights: 'Ecuador',
            kantar: 'Ecuador'
        },
        {
            cluster_name: 'South LAC',
            country_name: 'Paraguay',
            bgs_adhoc: 'adhoc',
            ddh_iwsr: 'Paraguay',
            ddh_retail: 'Paraguay',
            foresights: 'Paraguay',
            kantar: 'Paraguay'
        },
        {
            cluster_name: 'South LAC',
            country_name: 'Peru',
            bgs_adhoc: 'adhoc',
            ddh_iwsr: 'Peru',
            ddh_retail: 'Peru',
            foresights: 'Peru',
            kantar: 'Peru'
        },
        {
            cluster_name: 'South LAC',
            country_name: 'Uruguay',
            bgs_adhoc: 'adhoc',
            ddh_iwsr: 'Uruguay',
            ddh_retail: 'Uruguay',
            foresights: 'Uruguay',
            kantar: 'Uruguay'
        },

        // -------------------- Southern Europe --------------------
        {
            cluster_name: 'Southern Europe',
            country_name: 'France',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'France',
            ddh_retail: 'France',
            foresights: 'France',
            kantar: 'France'
        },
        {
            cluster_name: 'Southern Europe',
            country_name: 'Italy',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Italy',
            ddh_retail: 'Italy',
            foresights: 'Italy',
            kantar: 'Italy'
        },
        // -------------------- SWC Africa --------------------
        {
            cluster_name: 'SWC Africa',
            country_name: 'Angola',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Angola',
            ddh_retail: 'Angola',
            foresights: 'Angola',
            kantar: 'Angola'
        },
        {
            cluster_name: 'SWC Africa',
            country_name: 'Benin',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Benin',
            ddh_retail: 'Benin',
            foresights: 'Benin',
            kantar: 'Benin'
        },
        {
            cluster_name: 'SWC Africa',
            country_name: 'Botswana',
            bgs_adhoc: '',
            ddh_iwsr: 'Botswana',
            ddh_retail: 'Botswana',
            foresights: 'Botswana',
            kantar: 'Botswana'
        },
        {
            cluster_name: 'SWC Africa',
            country_name: 'Cameroon',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Cameroon',
            ddh_retail: 'Cameroon',
            foresights: 'Cameroon',
            kantar: 'Cameroon'
        },
        {
            cluster_name: 'SWC Africa',
            country_name: 'Congo, Democratic Republic',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Congo, Dem. Rep. of',
            ddh_retail: 'Congo, Dem. Rep. of',
            foresights: 'Democratic Republic of the Congo',
            kantar: 'Congo, Democratic Republic'
        },
        {
            cluster_name: 'SWC Africa',
            country_name: 'Congo-Brazzaville',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Congo - Brazzaville',
            ddh_retail: 'Congo - Brazzaville',
            foresights: 'Democratic Republic of the Congo',
            kantar: 'Congo-Brazzaville'
        },
        {
            cluster_name: 'SWC Africa',
            country_name: "Côte d'Ivoire",
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Ivory Coast',
            ddh_retail: 'Ivory Coast',
            foresights: 'Ivory Coast',
            kantar: "Côte d'Ivoire"
        },
        {
            cluster_name: 'SWC Africa',
            country_name: 'Djibouti',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Djibouti',
            ddh_retail: 'Djibouti',
            foresights: 'Djibouti',
            kantar: 'Djibouti'
        },
        {
            cluster_name: 'SWC Africa',
            country_name: 'Equatorial Guinea',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Equatorial Guinea',
            ddh_retail: 'Equatorial Guinea',
            foresights: 'Equatorial Guinea',
            kantar: 'Equatorial Guinea'
        },
        {
            cluster_name: 'SWC Africa',
            country_name: 'Ethiopia',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Ethiopia',
            ddh_retail: 'Ethiopia',
            foresights: 'Ethiopia',
            kantar: 'Ethiopia'
        },
        {
            cluster_name: 'SWC Africa',
            country_name: 'Gabon',
            bgs_adhoc: 'Adhoc',
            ddh_iwsr: 'Gabon',
            ddh_retail: 'Gabon',
            foresights: 'Gabon',
            kantar: 'Gabon'
        },
        {
            cluster_name: 'SWC Africa',
            country_name: 'Ghana',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Ghana',
            ddh_retail: 'Ghana',
            foresights: 'Ghana',
            kantar: 'Ghana'
        },
        {
            cluster_name: 'SWC Africa',
            country_name: 'Mauritius',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Mauritius',
            ddh_retail: 'Mauritius',
            foresights: 'Mauritius',
            kantar: 'Mauritius'
        },
        {
            cluster_name: 'SWC Africa',
            country_name: 'Mozambique',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Mozambique',
            ddh_retail: 'Mozambique',
            foresights: 'Mozambique',
            kantar: 'Mozambique'
        },
        {
            cluster_name: 'SWC Africa',
            country_name: 'Namibia',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Namibia',
            ddh_retail: 'Namibia',
            foresights: 'Namibia',
            kantar: 'Namibia'
        },
        {
            cluster_name: 'SWC Africa',
            country_name: 'Réunion',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Reunion',
            ddh_retail: 'Reunion',
            foresights: 'Reunion',
            kantar: 'Réunion'
        },
        {
            cluster_name: 'SWC Africa',
            country_name: 'Senegal',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Senegal',
            ddh_retail: 'Senegal',
            foresights: 'Senegal',
            kantar: 'Senegal'
        },
        {
            cluster_name: 'SWC Africa',
            country_name: 'Seychelles',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Seychelles',
            ddh_retail: 'Seychelles',
            foresights: 'Seychelles',
            kantar: 'Seychelles'
        },
        {
            cluster_name: 'SWC Africa',
            country_name: 'South Africa',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'South Africa',
            ddh_retail: 'South Africa',
            foresights: 'South Africa',
            kantar: 'South Africa'
        },
        {
            cluster_name: 'SWC Africa',
            country_name: 'Togo',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Togo',
            ddh_retail: 'Togo',
            foresights: 'Togo',
            kantar: 'Togo'
        },
        {
            cluster_name: 'SWC Africa',
            country_name: 'Zambia',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Zambia',
            ddh_retail: 'Zambia',
            foresights: 'Zambia',
            kantar: 'Zambia'
        },

        // -------------------- Turkiye --------------------
        {
            cluster_name: 'Turkiye',
            country_name: 'Turkiye',
            bgs_adhoc: 'BGS',
            ddh_iwsr: 'Turkey',
            ddh_retail: 'Turkey',
            foresights: 'Turkey',
            kantar: 'Turkey'
        },

    ]);
};




