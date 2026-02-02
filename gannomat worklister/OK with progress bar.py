import os
import xml.etree.ElementTree as ET
import customtkinter as ctk
from tkinter import filedialog, messagebox
from xml.dom import minidom

selected_folder = ""
modify_quantity = False
current_folder_index = 0
folder_list = []
entries_frame = None
entries = {}
file_list = []

# Poradie pre dielce
priority_order = [
    "BOK", "BKP", "BKL", "DNO", "STROP", "STR", "STD", "MV", "MK", "MVL", "MVP",
    "MKL", "MKP", "MKS", "MVS"
]
last_priority_order = ["DV", "DVL", "DVP", "DVERE", "CZ", "CZL", "CZP", "CZH", "CZD", "DVH", "DVD"]

# Funkcia na zoradenie súborov podľa priority
def sort_files(file_list):
    def file_priority(file_name):
        base_name = os.path.splitext(file_name)[0]
        for index, prefix in enumerate(priority_order):
            if prefix in base_name:
                return (0, index)  # Najvyššia priorita
        for index, prefix in enumerate(last_priority_order):
            if prefix in base_name:
                return (2, index)  # Najnižšia priorita
        return (1, file_name)  # Ostatné dielce idú do stredu
    
    return sorted(file_list, key=file_priority)

# Funkcia na vytvorenie XML worklistu
def create_worklist(folder_path, output_folder, quantities):
    folder_name = os.path.basename(folder_path)
    project_name = os.path.basename(os.path.dirname(folder_path))
    output_file = os.path.join(output_folder, f"{folder_name}.jblx")

    #Skontrolovať a vytvoriť priečinok `worklists`, ak neexistuje
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    fixed_base_path = r"C:\\GannoMAT Programs"
    root = ET.Element('Joblst', xmlns="http://tempuri.org/Joblst.xsd")

    # Získanie súborov z priečinka a zoradenie podľa priority
    # Ak bol zadaný slovník s množstvami (t.j. manuálne upravená skrinka),
    # použijeme manuálne nastavené poradie (uložené v globálnej premennej file_list).
    # Inak, pre skrinky bez manuálnej úpravy použijeme predvolené zoradenie.
    if modify_quantity and quantities:
        sorted_files = file_list  # Použijeme manuálne nastavené poradie
    else:
        files = [file_name for file_name in os.listdir(folder_path) if file_name.endswith(".ganx")]
        sorted_files = sort_files(files)  # Predvolené zoradenie

    

    # Pridanie súborov do XML
    for file_name in sorted_files:
        job = ET.SubElement(root, 'JobLstTable')
        ET.SubElement(job, 'Name').text = os.path.splitext(file_name)[0]
        fixed_file_path = os.path.join(fixed_base_path, project_name, folder_name, file_name)
        ET.SubElement(job, 'File').text = fixed_file_path
        description = extract_description(os.path.join(folder_path, file_name))
        ET.SubElement(job, 'Description').text = description
        ET.SubElement(job, 'Stueck').text = str(quantities.get(file_name, 1))

    # Naformátovanie XML na pekný výstup
    xml_str = ET.tostring(root, encoding='unicode')
    pretty_xml = minidom.parseString(xml_str).toprettyxml(indent="  ")

    # Uloženie XML do súboru
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(pretty_xml)

# Funkcia na extrahovanie hodnoty Description z XML súboru
def extract_description(xml_file_path):
    try:
        tree = ET.parse(xml_file_path)
        root = tree.getroot()
        namespace = {"ns": "http://tempuri.org/Programm.xsd"}
        description_element = root.find(".//ns:Description", namespace)
        return description_element.text if description_element is not None else ""
    except Exception as e:
        print(f"Chyba pri spracovaní súboru {xml_file_path}: {e}")
        return ""

# Funkcia na spracovanie priečinkov
def process_project_folder_with_ui(app, project_path, output_folder):
    global folder_list, current_folder_index

    # Skontrolujeme, či priečinok obsahuje podpriečinky (teda je to zákazka) alebo iba súbory (teda je to skrinka)
    subdirectories = [
        folder_name for folder_name in os.listdir(project_path) 
        if os.path.isdir(os.path.join(project_path, folder_name)) and folder_name != "worklists"
    ]

    # Ak priečinok neobsahuje ďalšie priečinky, ide o jednu skrinku
    if not subdirectories:        
        if modify_quantity:
            # Zobrazenie editovacieho rozhrania pre úpravu množstva dielcov
            show_edit_screen(app, project_path, output_folder)
        else:
            # Priame vytvorenie worklistu bez úpravy množstva
            create_worklist(project_path, output_folder, {})
            messagebox.showinfo("Hotovo", "Vytvorenie worklistu pre skrinku bolo úspešné!")
        
        return  # Ukončíme funkciu, aby sa ďalej nespracovávali podpriečinky

    # Ak priečinok obsahuje podpriečinky, ide o zákazku
    folder_list = subdirectories
    current_folder_index = 0

    # Ak je povolené manuálne upravovanie množstiev, zobrazíme editovacie rozhranie
    if modify_quantity and folder_list:
        show_edit_screen(app, os.path.join(project_path, folder_list[current_folder_index]), output_folder)
    else:
        # Automatické generovanie worklistov bez úpravy množstva
        for folder_name in folder_list:
            folder_path = os.path.join(project_path, folder_name)
            create_worklist(folder_path, output_folder, {})
        messagebox.showinfo("Hotovo", "Vytvorenie worklistov pre zákazku bolo úspešné!")


# Funkcia na zobrazenie editovacieho rozhrania
# Funkcia na zobrazenie editovacieho rozhrania
def show_edit_screen(app, folder_path, output_folder):
    def save_and_next():
        global current_folder_index, entries

        # Získanie množstiev dielcov z formulára
        quantities = {}
        for file_name, entry in entries.items():
            try:
                quantities[file_name] = int(entry["entry"].get())
            except ValueError:
                quantities[file_name] = 1

        # Ak ide o jednu skrinku, použije sa priamo `selected_folder`
        if not folder_list:
            folder_path = selected_folder
            create_worklist(folder_path, os.path.join(selected_folder, "worklists"), quantities)
            clear_edit_screen()
            messagebox.showinfo("Hotovo", "Vytvorenie worklistu pre skrinku bolo úspešné!")
            return  # Ukončí funkciu

        # Ak ide o zákazku, spracuje sa aktuálny priečinok
        folder_path = os.path.join(selected_folder, folder_list[current_folder_index])
        create_worklist(folder_path, os.path.join(selected_folder, "worklists"), quantities)

        # Posun na ďalší priečinok
        current_folder_index += 1

        # Ak existuje ďalší priečinok, zobrazíme editovacie rozhranie preň
        if current_folder_index < len(folder_list):
            next_folder_path = os.path.join(selected_folder, folder_list[current_folder_index])
            update_edit_screen(next_folder_path, save_and_next, save_and_finish)
        else:
            clear_edit_screen()
            messagebox.showinfo("Hotovo", "Vytvorenie worklistov pre zákazku bolo úspešné!")

    def save_and_finish():
        global current_folder_index, entries

        # Uloženie aktuálneho worklistu s upravenými hodnotami
        quantities = {}
        for file_name, entry in entries.items():
            try:
                quantities[file_name] = int(entry["entry"].get())
            except ValueError:
                quantities[file_name] = 1

        folder_path = os.path.join(selected_folder, folder_list[current_folder_index]) if folder_list else selected_folder
        create_worklist(folder_path, os.path.join(selected_folder, "worklists"), quantities)

        # Pre všetky zostávajúce worklisty nastavíme množstvo = 1 a zachované poradie
        for i in range(current_folder_index + 1, len(folder_list)):
            folder_path = os.path.join(selected_folder, folder_list[i])
            create_worklist(folder_path, os.path.join(selected_folder, "worklists"), {})

        clear_edit_screen()
        messagebox.showinfo("Hotovo", "Vytvorenie worklistov bolo úspešné!")

    update_edit_screen(folder_path, save_and_next, save_and_finish)

# Funkcia na aktualizáciu editovacieho rozhrania
def update_edit_screen(folder_path, save_command, finish_command):
    global entries_frame, entries, file_list, current_folder_index, folder_list

    # Vyčistenie editovacieho rozhrania, ak už existuje
    if entries_frame is not None:
        for widget in entries_frame.winfo_children():
            widget.destroy()

    # Zobrazenie názvu aktuálneho priečinka (skrinky)
    label_folder = ctk.CTkLabel(entries_frame, text=f"Úprava dielcov: {os.path.basename(folder_path)}", font=("Arial", 14))
    label_folder.pack(pady=10)

    # Vytvorenie scrollovacieho rámca pre zobrazenie dielcov
    frame = ctk.CTkScrollableFrame(entries_frame, width=450, height=350)
    frame.pack(pady=10, fill="y", expand=True)

    # Načítanie a zoradenie súborov podľa priority
    entries = {}
    file_list = sort_files([f for f in os.listdir(folder_path) if f.endswith(".ganx")])

    # Slovník pre uloženie referencií na riadky v GUI
    row_widgets = {}

    # Funkcie na presun poradia dielcov
    def move_up(index):
        if index > 0:
            file_list[index], file_list[index - 1] = file_list[index - 1], file_list[index]
            reorder_gui()

    def move_down(index):
        if index < len(file_list) - 1:
            file_list[index], file_list[index + 1] = file_list[index + 1], file_list[index]
            reorder_gui()

    # Funkcia na preskupenie prvkov v GUI bez ich mazania
    def reorder_gui():
        for widget in frame.winfo_children():
            widget.pack_forget()  # Skryjeme všetky prvky
        # Znovu zobrazíme riadky so správnym poradím
        for index, file_name in enumerate(file_list):
            row_frame = row_widgets[file_name]
            row_frame.pack(fill="x", pady=5)
            # Aktualizácia tlačidiel pre presun
            for widget in row_frame.winfo_children():
                if isinstance(widget, ctk.CTkButton):
                    widget.pack_forget()
            up_button = ctk.CTkButton(row_frame, text="↑", width=30, command=lambda i=index: move_up(i))
            up_button.pack(side="right", padx=1)
            down_button = ctk.CTkButton(row_frame, text="↓", width=30, command=lambda i=index: move_down(i))
            down_button.pack(side="right", padx=1)

    # Funkcia na vytvorenie riadka pre každý súbor
    def create_row(index, file_name):
        row_frame = ctk.CTkFrame(frame)
        row_frame.pack(fill="x", pady=5)
        row_widgets[file_name] = row_frame  # Uloženie referencie na riadok

        # Zobrazenie názvu súboru
        label = ctk.CTkLabel(row_frame, text=file_name, width=200, anchor="w")
        label.pack(side="left", padx=10)

        # Vytvorenie rámca pre úpravu množstva
        quantity_frame = ctk.CTkFrame(row_frame)
        quantity_frame.pack(side="right")

        minus_button = ctk.CTkButton(quantity_frame, text="-", width=30, command=lambda f=file_name: adjust_quantity(f, -1))
        minus_button.pack(side="left", padx=1)
        entry = ctk.CTkEntry(quantity_frame, width=50, justify="center")
        entry.insert(0, "1")
        entry.pack(side="left")
        plus_button = ctk.CTkButton(quantity_frame, text="+", width=30, command=lambda f=file_name: adjust_quantity(f, 1))
        plus_button.pack(side="left", padx=1)

        # Tlačidlá na presun poradia
        up_button = ctk.CTkButton(row_frame, text="↑", width=30, command=lambda i=index: move_up(i))
        up_button.pack(side="right", padx=1)
        down_button = ctk.CTkButton(row_frame, text="↓", width=30, command=lambda i=index: move_down(i))
        down_button.pack(side="right", padx=1)

        # Uloženie referencií na jednotlivé widgety
        entries[file_name] = {"entry": entry, "minus": minus_button, "plus": plus_button}

    # Vytvorenie riadkov pre všetky súbory v priečinku
    for index, file_name in enumerate(file_list):
        create_row(index, file_name)

    # Vytvorenie rámca pre tlačidlá, ktoré budú umiestnené vedľa seba
    button_frame = ctk.CTkFrame(entries_frame, fg_color="transparent")
    button_frame.pack(pady=10)

    button_save = ctk.CTkButton(button_frame, text="Uložiť a pokračovať", command=save_command)
    button_save.pack(side="left", padx=10)

    button_finish = ctk.CTkButton(button_frame, text="Uložiť a dokončiť", command=finish_command)
    button_finish.pack(side="left", padx=10)

    # Vytvorenie status baru, ktorý zobrazuje postup spracovania
    # Ak spracovávame viacero skrínek, zobrazí sa "Spracované skrinky: X/Y"
    if folder_list:
        total = len(folder_list)
        current = current_folder_index + 1  # pretože index začína od 0
        status_text = f"Spracované skrinky: {current}/{total}"
        progress_value = current / total
    else:
        status_text = "Spracovaná skrinka: 1/1"
        progress_value = 1.0

    # Vytvorenie rámca pre status bar s transparentným pozadím
    status_frame = ctk.CTkFrame(entries_frame, fg_color="transparent")
    status_frame.pack(pady=5, fill="x")

    # Label so stavom spracovania
    status_label = ctk.CTkLabel(status_frame, text=status_text)
    status_label.pack(side="left", padx=10)

    # Progres bar – vizuálne zobrazenie postupu
    progress_bar = ctk.CTkProgressBar(status_frame)
    progress_bar.set(progress_value)
    progress_bar.pack(side="left", fill="x", expand=True, padx=10, pady=5)

# Funkcia na úpravu množstva
def adjust_quantity(file_name, delta):
    global entries
    entry = entries[file_name]["entry"]
    try:
        current_value = int(entry.get())
    except ValueError:
        current_value = 1
    entry.delete(0, "end")
    entry.insert(0, str(max(1, current_value + delta)))

# Funkcia na vyčistenie editovacieho rozhrania
def clear_edit_screen():
    global entries_frame
    for widget in entries_frame.winfo_children():
        widget.destroy()

# Funkcia na výber priečinka
def select_folder(label):
    global selected_folder
    selected_folder = filedialog.askdirectory(title="Vyberte priečinok zákazky alebo skrinky")
    if selected_folder:
        label.configure(text=selected_folder)

# Funkcia na spustenie generovania worklistov
def start_processing(app):
    global selected_folder, folder_list, current_folder_index, file_list, entries
    if not selected_folder:
        messagebox.showerror("Chyba", "Najskôr vyberte priečinok zákazky alebo skrinky!")
        return
    
    # Resetovanie globálneho stavu pred spustením nového spracovania
    folder_list = []
    current_folder_index = 0
    file_list = []
    entries = {}

    output_folder = os.path.join(selected_folder, "worklists")
    try:
        process_project_folder_with_ui(app, selected_folder, output_folder)
    except Exception as e:
        error_message = f"Nastala chyba: {str(e)}"
        with open("error_log.txt", "a") as log_file:
            log_file.write(error_message + "\n")
        messagebox.showerror("Chyba", error_message)

# Nastavenie zmeny množstva dielcov
def toggle_modify_quantity():
    global modify_quantity
    modify_quantity = not modify_quantity

# GUI aplikácia
def main():
    global entries_frame

    app = ctk.CTk()
    app.title("Gannomat Worklister")
    app.geometry("500x720")
    app.minsize(500, 720)

    label_path = ctk.CTkLabel(app, text="Zvolená cesta: Žiadna", font=("Arial", 14))
    label_path.pack(pady=10)

    button_select = ctk.CTkButton(app, text="Vybrať priečinok zákazky alebo skrinky", command=lambda: select_folder(label_path))
    button_select.pack(pady=10)

    checkbox_modify = ctk.CTkCheckBox(app, text="Upraviť množstvo alebo poradie dielcov", command=toggle_modify_quantity)
    checkbox_modify.pack(pady=10)

    button_generate = ctk.CTkButton(app, text="Vytvoriť worklisty", command=lambda: start_processing(app))
    button_generate.pack(pady=10)

    entries_frame = ctk.CTkFrame(app)
    entries_frame.pack(fill="both", expand=True)

    app.mainloop()

if __name__ == '__main__':
    main()
