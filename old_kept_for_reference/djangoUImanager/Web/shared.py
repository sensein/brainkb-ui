# -*- coding: utf-8 -*-
# -----------------------------------------------------------------------------
# DISCLAIMER: This software is provided "as is" without any warranty,
# express or implied, including but not limited to the warranties of
# merchantability, fitness for a particular purpose, and non-infringement.
#
# In no event shall the authors or copyright holders be liable for any
# claim, damages, or other liability, whether in an action of contract,
# tort, or otherwise, arising from, out of, or in connection with the
# software or the use or other dealings in the software.
# -----------------------------------------------------------------------------

# @Author  : Tek Raj Chhetri
# @Email   : tekraj@mit.edu
# @Web     : https://tekrajchhetri.com/
# @File    : shared.py
# @Software: PyCharm

from urllib.parse import urlparse
import json

import textwrap
from collections import defaultdict


def _format_underscore_string(s):
    if "_" in s:
        words = s.split('_')
        words = [word.capitalize() for word in words]
        formatted_string = ' '.join(words)
        return formatted_string
    else:
        return s


def split_and_extract_last(value):
    if '#' in value:
        last_part = value.split('#')[-1]
    else:
        last_part = value.split('/')[-1]
    last_part = format_text_with_space(_format_underscore_string(last_part))
    return last_part

def split_and_extract_last_only(value):
    if '#' in value:
        last_part = value.split('#')[-1]
    else:
        last_part = value.split('/')[-1]

    return last_part


def format_text_with_space(text):
    # convert wasDerivedFrom to Was Derived From
    words = []
    start = 0

    for i in range(1, len(text)):
        if text[i].isupper():
            words.append(text[start:i])
            start = i

    words.append(text[start:])
    words[0] = words[0].capitalize()
    formatted_text = " ".join(words)

    return formatted_text


def extract_uri_data(url):
    parsed_url = urlparse(url)
    if parsed_url.fragment:
        return parsed_url.fragment
    else:
        return parsed_url.path.split('/')[-1]


def filter_data(list_of_dict, filter_uris):
    filtered_data = [entry for entry in list_of_dict if entry['p']['value'] in filter_uris]
    return filtered_data


def capitalize_first_letter_only(text):
    if text:
        return text[0].upper() + text[1:]
    return text


def format_sentence(text):
    formatted_text = text.replace('_', ' ').capitalize()
    return formatted_text


def get_category_value(data):
    for property in data:
        if 'property' in property and property['property'] == 'https://w3id.org/biolink/vocab/category':
            if type(property['value']) == list:
                return property['value'][0]
            else:
                return property['value']
    return None


def get_filter_uirs_label(kbobj):
    label_list = []
    original_label = []
    column_names = ['display_column_first', 'display_column_second', 'display_column_third', 'display_column_fourth']
    for column in column_names:
        column_data = getattr(kbobj[0], column, None)

        if column_data:
            try:
                original_label.append(column_data)
                if '_' in column_data:
                    label_list.append(format_sentence(column_data))
                else:
                    label_list.append(capitalize_first_letter_only(column_data))
            except Exception as e:
                print(f"An error occurred while processing {column}: {e}")

    return {"processed_label": label_list,
            "pre_processed_label":
                original_label
            }


def fetch_all_matching_genome_info_query(ids):
    query = textwrap.dedent(
        """SELECT ?s (GROUP_CONCAT(?p; separator="||") AS ?property) (GROUP_CONCAT(?o; separator="||") AS ?object) WHERE {{
          VALUES ?s {{
            {0}
          }}
          ?s ?p ?o .
        }}
        GROUP BY ?s
        """
    ).format(" ".join([f"<{id}>" for id in ids]))
    return query


def extract_data_either_s_p_o_match(param):
    query = textwrap.dedent(
        """
            PREFIX NIMP: <http://example.org/NIMP/>
            PREFIX prov: <http://www.w3.org/ns/prov#>
            PREFIX biolink: <https://w3id.org/biolink/vocab/>
            
            SELECT DISTINCT ?subject ?predicate ?object ?category_type
              WHERE {{
                {{ BIND(<{0}> AS ?id)
                  ?subject ?predicate ?id . }}
                UNION
                {{ BIND(<{0}> AS ?id)
                  ?id ?predicate ?object . }}
                UNION
                {{ BIND(<{0}> AS ?id)
                  ?subject ?id ?object . }}
                  
                OPTIONAL {{
                    ?id prov:wasDerivedFrom ?derivedFrom .
                    ?derivedFrom biolink:category ?category_type .
                }}
              }}"""
    ).format(param)
    return query


def extract_data_doner_tissuesample_match_query(category, nimp_id):
    """Query to fetch DONER and Tissue sample in relation to NIMP based on biolink:category value
    """
    query = textwrap.dedent(""" 
        PREFIX biolink: <https://w3id.org/biolink/vocab/>
        PREFIX prov: <http://www.w3.org/ns/prov#>
        PREFIX bican: <https://identifiers.org/brain-bican/vocab/>
        PREFIX NIMP: <http://example.org/NIMP/>
        
        SELECT DISTINCT ?entity (GROUP_CONCAT(DISTINCT ?targetType; separator=", ") AS ?tissuedonertype) 
            (GROUP_CONCAT(DISTINCT ?species_value_for_taxon_match; separator=", ") AS ?species_value_match_in_gars) 
            (GROUP_CONCAT(DISTINCT ?structure_value_for_tissue_sample; separator=", ") AS ?structure_value_match_in_ansrs) 
            (GROUP_CONCAT(DISTINCT ?target; separator=", ") AS ?targets)
            WHERE {{
              ?entity biolink:category <{0}>.
              ?entity (prov:wasDerivedFrom)+ ?intermediate.
              ?intermediate (prov:wasDerivedFrom)+ ?target.
              ?target biolink:category ?targetType.
              FILTER(?targetType IN (bican:Donor, bican:TissueSample))  
              OPTIONAL {{
                ?target bican:species ?species_value_for_taxon_match.
                FILTER(?targetType = bican:Donor)
              }}
              OPTIONAL {{
                ?target bican:structure ?structure_value_for_tissue_sample.
              }}  
              FILTER(?entity = <{1}>) 
            }}
        GROUP BY ?entity ?targetType""").format(category, nimp_id)
    return query


def nimp_gars(taxon_id):
    query = textwrap.dedent("""
            PREFIX biolink: <https://w3id.org/biolink/vocab/>
            PREFIX NIMP: <http://example.org/NIMP/>
            PREFIX bican: <https://identifiers.org/brain-bican/vocab/>
            SELECT DISTINCT (?gar_obj as ?s) (GROUP_CONCAT(DISTINCT ?sp; separator=", ") AS ?property) (GROUP_CONCAT(DISTINCT ?oo; separator=", ") AS ?object)     
            WHERE {{
                {{
                    SELECT ?gar_obj WHERE {{
                        ?gar_id biolink:in_taxon ?gar_obj. 
                        FILTER(?gar_obj = <{0}>)
                    }}
                }}
                OPTIONAL {{
                    ?gar_obj ?sp ?oo .
                }}
            }} GROUP BY ?gar_obj
    """).format(taxon_id.lower().strip())
    return query


def nimp_ansrs(structure):
    query = textwrap.dedent("""
            PREFIX ansrs: <https://w3id.org/my-org/ansrs-schema/>
            PREFIX biolink: <https://w3id.org/biolink/vocab/>
            SELECT ?s  
                   (GROUP_CONCAT(CONCAT(STR(?property), "||", ?objects); separator="; ") AS ?property_objects)
            WHERE {{
                {{
                    SELECT ?s ?o WHERE {{
                        ?s ansrs:has_parent_parcellation_term ?o.
                        FILTER(CONTAINS(STR(?s), "{0}"))
                    }}
                }}
                OPTIONAL {{
                    SELECT ?s ?property (GROUP_CONCAT(DISTINCT STR(?object); separator=", ") AS ?objects)
                    WHERE {{
                        ?s ?property ?object .
                    }}
                    GROUP BY ?s ?property
                }}
            }} GROUP BY ?s
         """).format(structure.lower())
    return query


def all_species_genome_by_taxon(taxon_id, offset=0):
    """Paginated Query for all species"""
    newlimit = 100
    query = textwrap.dedent("""
            PREFIX biolink: <https://w3id.org/biolink/vocab/>
            SELECT DISTINCT *
            WHERE {{
                 ?id biolink:in_taxon ?gar_obj.
                        FILTER(?gar_obj = <{0}>)
            }}  LIMIT {1}
                OFFSET {2}
            """).format(taxon_id.lower().strip(), newlimit, offset)

    return query

def species_pagination_count_by_taxon(taxon_id):
    """query to count total occurences of species for pagination """
    query = textwrap.dedent("""
                PREFIX biolink: <https://w3id.org/biolink/vocab/>
                SELECT DISTINCT  (COUNT(?id) AS ?count)
                WHERE {{
                     ?id biolink:in_taxon ?gar_obj.
                            FILTER(?gar_obj = <{0}>)
                }}   
                """).format(taxon_id.lower().strip())
    return query

def get_donor_data_by_id(donor_id):
    query = textwrap.dedent("""
            select DISTINCT * where {{
                ?s ?property ?object .
                FILTER(?s = <{0}>)
            }}
    """).format(donor_id)
    return query

def get_donor_by_id_concat(donor_id):
    query = textwrap.dedent("""
    select DISTINCT  ?s (GROUP_CONCAT(DISTINCT ?sp; separator=", ") AS ?property) (GROUP_CONCAT(DISTINCT ?oo; separator=", ") AS ?object)  where {{
                ?s ?sp ?oo .
                FILTER(?s = <{0}>)
            }}
            GROUP BY ?s
    """).format(donor_id)
    return query

def get_structure_count():
    query = textwrap.dedent("""
        PREFIX bican: <https://identifiers.org/brain-bican/vocab/>  
        SELECT DISTINCT (COUNT (?id) as ?count)
        WHERE {{
          ?id bican:structure ?o; 
        }}
    """)
    return query

def get_libraryaliquot_count():
    query = textwrap.dedent("""
            PREFIX bican: <https://identifiers.org/brain-bican/vocab/> 
            PREFIX biolink: <https://w3id.org/biolink/vocab/>   
            SELECT DISTINCT (COUNT(?id) as ?count )
            WHERE {{
              ?id biolink:category bican:LibraryAliquot; 
            }}
    """)
    return query

def get_species_count():
    query = textwrap.dedent("""
       PREFIX biolink: <https://w3id.org/biolink/vocab/> 
        select DISTINCT (COUNT(?s) as ?count) where {{
           ?s biolink:iri ?o.
        }}  
    """)
    return query

def get_donor_count():
    query = textwrap.dedent("""
        PREFIX bican: <https://identifiers.org/brain-bican/vocab/> 
        PREFIX biolink: <https://w3id.org/biolink/vocab/>   
        SELECT DISTINCT (COUNT(?id) as ?count )
        WHERE {{
          ?id biolink:category bican:Donor; 
        }}
    """)
    return query

def get_tissuesample_data_by_id(tissue_id):
    query = textwrap.dedent("""
            select  DISTINCT * where {{
            ?tissue_id ?property ?object .
            FILTER(?tissue_id = <{0}>)
        }}  
    """).format(tissue_id)
    return query


def _sex_int_to_word(sex_id):
    if int(sex_id) == 1:
        return "Male"
    elif int(sex_id) == 2:
        return "Female"
    elif int(sex_id) == 7:
        return "Other"
    elif int(sex_id) == 8:
        return "Unknown"
    else:
        return "Not Reported"


def doner_tissue_to_js(data):
    js_data = []
    unit_type = None
    for item in data:

        if not ("donor" in item["object"]["value"].lower() or "tissuesample" in item["object"]["value"].lower()):
            key = split_and_extract_last(item["property"]["value"])
            value = item["object"]["value"]

            if key == "Label":
                key = "Local Name"
            elif key == "Was Derived From":
                key = "Source"
                value = extract_uri_data(item["object"]["value"])
            elif key == "Species":
                key = "Taxon Number"
            elif key == "Age  At  Death  Unit":
                unit_type = value
            elif key == "Age  At  Death  Value":
                value = f"{int(float(value))} {unit_type}"
            elif key == "Biological  Sex":
                value = _sex_int_to_word(value)

            js_data.append({key: value})

    filtered_js_data = [d for d in js_data if "Age  At  Death  Unit" not in d]
    return filtered_js_data


def group_dict(list_of_dict):
    grouped_data = defaultdict(lambda: {'value': [], 'category_type': []})

    for item in list_of_dict:
        grouped_data[item['property']]['value'].append(item['value'])
        grouped_data[item['property']]['category_type'].append(item['category_type'])

    result = []
    for key, values in grouped_data.items():
        if len(values['value']) > 1:
            result.append({
                'property': key,
                'value': dict(zip(values['value'], values['category_type'])),
            })
        else:
            result.append({
                'property': key,
                'value': values['value'][0],
            })
    return result


def format_data_for_kb_single(fetched_data):
    data_to_display = []
    localname = None
    for data in fetched_data:
        if 'object' in data and data['object'] is not None:
            if data['predicate']['value'] == "http://www.w3.org/2000/01/rdf-schema#label":
                localname = data['object']['value']
            else:
                data_to_display.append({"property": data['predicate']['value'],
                                        "value": data['object']['value'],
                                        "category_type": data["category_type"]["value"]}
                                       )
    grouped_data = group_dict(data_to_display)
    return {"localname": localname, "grouped_data": grouped_data}


def parse_property_objects(data):
    result = {}

    property_objects = data['property_objects']['value']

    properties = property_objects.split('; ')

    for prop in properties:
        prop_name, prop_values = prop.split('||', 1)

        if "description" in prop_name or "name" in prop_name:
            values_list = prop_values
        else:
            values_list = prop_values.split(', ')
        result[prop_name] = values_list

    return result


def format_ansrs_data_for_kb_single(ansrs_data, fetch_knowledge_base):
    data_to_display = []
    for structure in ansrs_data:
        try:
            for data in fetch_knowledge_base(nimp_ansrs(structure))["message"]["results"]["bindings"]:
                data_to_display.append({data["s"]["value"]: parse_property_objects(data)})
        except Exception as e:
            print("No data found")
    return data_to_display


def format_data_to_dict(data, splitcriteria):
    return {data["s"]["value"]: {"property":
                                     [item.strip() for item in
                                      data["property"]["value"].split(splitcriteria)],
                                 "object": [item.strip() for item in
                                            data["object"]["value"].split(splitcriteria)]}}

def format_species_annotation_data(species_data):
    data_to_display = []
    for species in species_data:
        data_to_display.append(format_data_to_dict(species, "||"))
    return data_to_display


def format_gars_data_for_kb_single(gars_data, fetch_knowledge_base):
    data_to_display = []
    for in_taxon in gars_data:
        try:
            if fetch_knowledge_base(nimp_gars(in_taxon))["message"]["results"]["bindings"]:
                for data in fetch_knowledge_base(nimp_gars(in_taxon))["message"]["results"]["bindings"]:
                    data_to_display.append(format_data_to_dict(data, ","))
        except Exception as e:
            print("No data found")
    return data_to_display

def format_donor_for_kb_single(donors, fetch_knowledge_base):
    data_to_display = []
    for donor in donors:
        try:
            if fetch_knowledge_base(get_donor_by_id_concat(donor))["message"]["results"]["bindings"]:
                for data in fetch_knowledge_base(get_donor_by_id_concat(donor))["message"]["results"]["bindings"]:
                    data_to_display.append(format_data_to_dict(data, ","))
        except Exception as e:
            print("No data found")
    return data_to_display


def donor_tissues_data_for_kb_single(tissue_doner_data):
    donor_tissue = {}
    for items in tissue_doner_data:
        donor_tissue[items["tissuedonertype"]["value"].lower().split("/")[-1]] = items["targets"]["value"]

    donor_tissue["donor"] = donor_tissue["donor"].split(",")
    donor_tissue["tissuesample"] = donor_tissue["tissuesample"].split(",")
    return donor_tissue
