export type StarterTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  workspace: Record<string, unknown>;
};

const textBlock = (val: string) => ({
  type: 'html_text',
  fields: { VALUE: val },
});

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'birthday',
    name: 'Undangan Ulang Tahun',
    description: 'Halaman undangan pesta dengan foto kue, jadwal acara, dan tombol hadir.',
    icon: '🎂',
    workspace: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'html_document',
            x: 20,
            y: 20,
            inputs: {
              CONTENT: {
                block: {
                  type: 'html_head',
                  inputs: {
                    CONTENT: {
                      block: {
                        type: 'html_title',
                        inputs: { TEXT: { block: textBlock('Pesta Ulang Tahun') } },
                      },
                    },
                  },
                  next: {
                    block: {
                      type: 'html_body',
                      inputs: {
                        CONTENT: {
                          block: {
                            type: 'html_heading',
                            fields: { LEVEL: 'h1' },
                            inputs: { TEXT: { block: textBlock('Pesta Ulang Tahunku! 🎂') } },
                            next: {
                              block: {
                                type: 'html_paragraph',
                                inputs: {
                                  TEXT: {
                                    block: textBlock(
                                      'Hai teman-teman! Yuk datang merayakan ulang tahunku yang ke-10.',
                                    ),
                                  },
                                },
                                next: {
                                  block: {
                                    type: 'html_image_asset',
                                    fields: {
                                      ASSET: 'builtin:cake',
                                      ALT: 'Kue Ulang Tahun',
                                      WIDTH: 140,
                                    },
                                    next: {
                                      block: {
                                        type: 'html_list',
                                        inputs: {
                                          ITEMS: {
                                            block: {
                                              type: 'html_list_item',
                                              inputs: {
                                                TEXT: {
                                                  block: textBlock('📅 Hari: Sabtu, 25 Oktober'),
                                                },
                                              },
                                              next: {
                                                block: {
                                                  type: 'html_list_item',
                                                  inputs: {
                                                    TEXT: {
                                                      block: textBlock('⏰ Pukul: 15.00 WIB'),
                                                    },
                                                  },
                                                  next: {
                                                    block: {
                                                      type: 'html_list_item',
                                                      inputs: {
                                                        TEXT: {
                                                          block: textBlock('🏠 Lokasi: Rumah Budi'),
                                                        },
                                                      },
                                                    },
                                                  },
                                                },
                                              },
                                            },
                                          },
                                        },
                                        next: {
                                          block: {
                                            type: 'html_details',
                                            fields: { OPEN: true },
                                            inputs: {
                                              BODY: {
                                                block: {
                                                  type: 'html_summary',
                                                  inputs: {
                                                    TEXT: {
                                                      block: textBlock('🎁 Petunjuk Pakaian'),
                                                    },
                                                  },
                                                  next: {
                                                    block: {
                                                      type: 'html_paragraph',
                                                      inputs: {
                                                        TEXT: {
                                                          block: textBlock(
                                                            'Gunakan pakaian warna-warni ceria!',
                                                          ),
                                                        },
                                                      },
                                                    },
                                                  },
                                                },
                                              },
                                            },
                                            next: {
                                              block: {
                                                type: 'html_button',
                                                fields: { TYPE: 'button' },
                                                inputs: {
                                                  TEXT: { block: textBlock('Saya Akan Hadir!') },
                                                },
                                              },
                                            },
                                          },
                                        },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    },
  },
  {
    id: 'profile',
    name: 'Biodata Diri',
    description: 'Halaman profil diri dengan foto, cerita singkat, dan daftar hobi bernomor.',
    icon: '👤',
    workspace: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'html_document',
            x: 20,
            y: 20,
            inputs: {
              CONTENT: {
                block: {
                  type: 'html_head',
                  inputs: {
                    CONTENT: {
                      block: {
                        type: 'html_title',
                        inputs: { TEXT: { block: textBlock('Profil Saya') } },
                      },
                    },
                  },
                  next: {
                    block: {
                      type: 'html_body',
                      inputs: {
                        CONTENT: {
                          block: {
                            type: 'html_header',
                            inputs: {
                              BODY: {
                                block: {
                                  type: 'html_heading',
                                  fields: { LEVEL: 'h1' },
                                  inputs: {
                                    TEXT: { block: textBlock('Halo, Aku Pelajar Kreatif! 👋') },
                                  },
                                },
                              },
                            },
                            next: {
                              block: {
                                type: 'html_image_asset',
                                fields: { ASSET: 'builtin:sun', ALT: 'Foto Profil', WIDTH: 100 },
                                next: {
                                  block: {
                                    type: 'html_paragraph',
                                    inputs: {
                                      TEXT: {
                                        block: textBlock(
                                          'Aku senang belajar membuat halaman web dengan menyusun blok-blok kode.',
                                        ),
                                      },
                                    },
                                    next: {
                                      block: {
                                        type: 'html_heading',
                                        fields: { LEVEL: 'h2' },
                                        inputs: { TEXT: { block: textBlock('Hobi & Minat:') } },
                                        next: {
                                          block: {
                                            type: 'html_list_ordered',
                                            fields: { TYPE: '1', START: 1 },
                                            inputs: {
                                              ITEMS: {
                                                block: {
                                                  type: 'html_list_item',
                                                  inputs: {
                                                    TEXT: {
                                                      block: textBlock('Membaca buku cerita'),
                                                    },
                                                  },
                                                  next: {
                                                    block: {
                                                      type: 'html_list_item',
                                                      inputs: {
                                                        TEXT: {
                                                          block: textBlock('Bermain sepak bola'),
                                                        },
                                                      },
                                                      next: {
                                                        block: {
                                                          type: 'html_list_item',
                                                          inputs: {
                                                            TEXT: {
                                                              block: textBlock(
                                                                'Belajar coding HTML di Kodako',
                                                              ),
                                                            },
                                                          },
                                                        },
                                                      },
                                                    },
                                                  },
                                                },
                                              },
                                            },
                                          },
                                        },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    },
  },
  {
    id: 'menu',
    name: 'Daftar Menu & Pesanan',
    description: 'Tabel menu makanan kafe bergaris dengan formulir pemesanan.',
    icon: '📋',
    workspace: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'html_document',
            x: 20,
            y: 20,
            inputs: {
              CONTENT: {
                block: {
                  type: 'html_head',
                  inputs: {
                    CONTENT: {
                      block: {
                        type: 'html_title',
                        inputs: { TEXT: { block: textBlock('Kafe Ceria') } },
                      },
                    },
                  },
                  next: {
                    block: {
                      type: 'html_body',
                      inputs: {
                        CONTENT: {
                          block: {
                            type: 'html_heading',
                            fields: { LEVEL: 'h1' },
                            inputs: { TEXT: { block: textBlock('Kafe Ceria ☕🍰') } },
                            next: {
                              block: {
                                type: 'html_table',
                                fields: {
                                  BORDER_WIDTH: '1px',
                                  BORDER_STYLE: 'solid',
                                  BORDER_COLOR: '#1e88e5',
                                },
                                inputs: {
                                  ROWS: {
                                    block: {
                                      type: 'html_caption',
                                      inputs: {
                                        TEXT: { block: textBlock('Menu Pilihan Hari Ini') },
                                      },
                                      next: {
                                        block: {
                                          type: 'html_table_row',
                                          inputs: {
                                            CELLS: {
                                              block: {
                                                type: 'html_table_header_cell',
                                                inputs: {
                                                  TEXT: { block: textBlock('Menu Makanan') },
                                                },
                                                next: {
                                                  block: {
                                                    type: 'html_table_header_cell',
                                                    inputs: { TEXT: { block: textBlock('Harga') } },
                                                  },
                                                },
                                              },
                                            },
                                          },
                                          next: {
                                            block: {
                                              type: 'html_table_row',
                                              inputs: {
                                                CELLS: {
                                                  block: {
                                                    type: 'html_table_cell',
                                                    inputs: {
                                                      TEXT: { block: textBlock('Kue Cokelat') },
                                                    },
                                                    next: {
                                                      block: {
                                                        type: 'html_table_cell',
                                                        inputs: {
                                                          TEXT: { block: textBlock('Rp 15.000') },
                                                        },
                                                      },
                                                    },
                                                  },
                                                },
                                              },
                                              next: {
                                                block: {
                                                  type: 'html_table_row',
                                                  inputs: {
                                                    CELLS: {
                                                      block: {
                                                        type: 'html_table_cell',
                                                        inputs: {
                                                          TEXT: {
                                                            block: textBlock('Es Teh Manis'),
                                                          },
                                                        },
                                                        next: {
                                                          block: {
                                                            type: 'html_table_cell',
                                                            inputs: {
                                                              TEXT: {
                                                                block: textBlock('Rp 5.000'),
                                                              },
                                                            },
                                                          },
                                                        },
                                                      },
                                                    },
                                                  },
                                                },
                                              },
                                            },
                                          },
                                        },
                                      },
                                    },
                                  },
                                },
                                next: {
                                  block: {
                                    type: 'html_form',
                                    inputs: {
                                      BODY: {
                                        block: {
                                          type: 'html_heading',
                                          fields: { LEVEL: 'h2' },
                                          inputs: { TEXT: { block: textBlock('Pesan Sekarang') } },
                                          next: {
                                            block: {
                                              type: 'html_label',
                                              inputs: { TEXT: { block: textBlock('Nama Anda:') } },
                                              next: {
                                                block: {
                                                  type: 'html_input_text',
                                                  fields: { PLACEHOLDER: 'Tulis nama pemesan...' },
                                                  next: {
                                                    block: {
                                                      type: 'html_input_checkbox',
                                                      fields: { CHECKED: true },
                                                      inputs: {
                                                        TEXT: {
                                                          block: textBlock('Tambah Es Batu'),
                                                        },
                                                      },
                                                      next: {
                                                        block: {
                                                          type: 'html_button',
                                                          fields: { TYPE: 'submit' },
                                                          inputs: {
                                                            TEXT: {
                                                              block: textBlock('Kirim Pesanan'),
                                                            },
                                                          },
                                                        },
                                                      },
                                                    },
                                                  },
                                                },
                                              },
                                            },
                                          },
                                        },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    },
  },
];
